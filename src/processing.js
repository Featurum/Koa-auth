'use strict';
import Joi from 'joi';
import fs from 'fs';
import path from 'path';
import env from 'dotenv';
// hotp
import * as otplib from 'otplib';
import { authenticator, totp, hotp } from 'otplib';

import jwt from 'jsonwebtoken';
import uuid from 'uuid/v4';

/* SQL запросы */
import db from './functions/db.js';

/* Схема полей для валидации */
import schema from './schema.js';

/* Шина отправки сообщений */
import sendMessage from './functions/sendMessage.js';

/* Конфигурация */
env.config();

import constants from './consts.js';

const ALGORITHM = 'RS256';
const PRIVATE_KEY = fs.readFileSync(path.resolve('./keys/private.key'), 'utf8');
const PUBLIC_KEY = fs.readFileSync(path.resolve('./keys/public.key'), 'utf8');
const HOTP_COUNTER = 0;

/* Генерация пары токенов */
async function generateTokens(user, token) {
	const access_token = jwt.sign({ user, type: 'access' }, PRIVATE_KEY, { expiresIn: '10m', algorithm:  ALGORITHM })
  	const refresh_token = uuid();

  	try {
  		/* Дата валидности токена */
	    let expirationTime = new Date(new Date().setHours(new Date().getHours() + 1));

	  	if(token) {
	  		await db.none('UPDATE tokens SET token = $2, exptime = $3 WHERE token = $1', [ token, refresh_token, expirationTime ]);
	  	} else {
	  		await db.one('INSERT INTO tokens("user", token, exptime) VALUES($1, $2, $3) RETURNING *', [ user.id, refresh_token, expirationTime ]);
	  	}

	  	return {
			access_token,
			refresh_token
	  	}
	} catch (e) {
		return false;
	}
}

/* Создание пары токенов и сохранение в БД */
async function createTokens(user) {
	try {
		return generateTokens(user);
	} catch (e) {
		return false;
	}
}

/* Создание пары токенов и перезапись в БД */
async function refreshTokens(token) {
	try {
		return await db.task(async t => {
			let user = await t.any(
				'SELECT * FROM tokens LEFT JOIN users ON tokens.user = users.id WHERE tokens.token = $1 AND tokens.exptime >= $2',
				[ token, new Date() ]
			);

			if(user && user.length) {
				return generateTokens(user, token);
			} else {
				throw '';
			}
		})
	} catch (error) {
		return false;
	}
}


/* Удаление токена из БД */
async function deleteTokens(token) {
	try {
		return await db.any('DELETE FROM tokens WHERE token = $1', token);
	} catch (error) {
		return false;
	}
}

/* Заявка на регистрацию/авторизацию */
export async function task(data) {
	try {
		/* Валидация */
		try {
			await Joi.validate(data, schema.task);
		} catch (_) {
			throw constants.ERRORS.DATA;
		}

	    /* Дата валидности токена */
	    let stopDateTime = new Date(new Date().setMinutes(new Date().getMinutes() + 1));

	    /* Дата валидности записи */
	    let expirationTime = new Date(new Date().setHours(new Date().getHours() + 1));

	    /* Генерация ключа */
		let secret = authenticator.generateSecret();

		try {
			let result = await db.task(async t => {
				/* Проверка существования таски */
				let task = await t.query('SELECT * FROM registration WHERE email = $1', data.email);

				if(task && task.length) {
					/* Проверка прошла ли минута с последней заявки */
					if(Date.parse(task[0].stoptime) < new Date()) {
						return await t.none(
							`
								UPDATE
									registration
								SET
									secret = $2,
									stoptime = $3,
									exptime = $4
								WHERE
									email = $1
							`,
							[ data.email, secret, stopDateTime, expirationTime ]
						);
					} else {
						throw constants.ERRORS.LIMIT;
					}
				} else {
					/* Создание новой таски */
					return await t.one(
			    		'INSERT INTO registration(email, secret, stoptime, exptime) VALUES($1, $2, $3, $4) RETURNING id',
			    		[ data.email, secret, stopDateTime, expirationTime ]
			    	);
				}
			});
		} catch(error) {
			throw error.code === 'AUTH_5' ? error : constants.ERRORS.DATA_BASE;
		}

		try {
			// let code = totp.generate(secret);
			let code = hotp.generate(secret, HOTP_COUNTER);
			await sendMessage(data.email, code);

			return {
				result: true
			}
		} catch(error) {
			throw constants.ERRORS.SENG_CODE;
		}
	} catch (error) {
		return {
			result: false,
			error: error || constants.ERRORS.AUTHENTICATION
		};
	}
}


/* Проверка кода */
export async function check(data) {
	try {
		/* Валидация */
		try {
			await Joi.validate(data, schema.check);
		} catch (_) {
			throw constants.ERRORS.DATA;
		}

		try {
			let isValidCode = await db.task(async t => {
				/* Проверка существования таски */
				let task = await t.any('SELECT * FROM registration WHERE email = $1', data.email);

				if(task && task.length) {
					// return totp.check(data.code, task[0].secret);
					return hotp.check(data.code, task[0].secret, HOTP_COUNTER);
				} else {
					return false;
					throw constants.ERRORS.EMAIL;
				}
			})

			if(!isValidCode) {
				throw constants.ERRORS.CODE;
			}
		} catch (error) {
			if(error.routine) {
				throw constants.ERRORS.DATA_BASE;
			} else {
				throw error;
			}
		}

		try {
			return await db.task(async t => {
				/* Удаление заявки на регистрацию */
				t.none('DELETE FROM registration WHERE email = $1', data.email);

				let user;
				try {
					/* Проверка существования пользователя */
					user = await t.one('SELECT * FROM users WHERE email = $1', data.email);
				} catch (error) {
					/* Регистрация нового пользователя */
					user = await t.one('INSERT INTO users(email) VALUES($1) RETURNING *', [ data.email ]);
				}

				let tokens = await createTokens(user);

				if(tokens.access_token && tokens.refresh_token) {
					return {
						result: true,
						data: tokens
					}
				} else {
					throw constants.ERRORS.AUTHENTICATION;
				}
			})
		} catch (error) {
			if(error.routine) {
				throw constants.ERRORS.DATA_BASE;
			} else {
				throw error;
			}
		}
	} catch (error) {
		return {
			result: false,
			error: error
		}
	}
}


/* Обновление токенов */
export async function refresh(data) {
	try {
		/* Валидация */
		try {
			await Joi.validate(data, schema.refresh)
		} catch (error) {
			throw constants.ERRORS.DATA
		}

		let tokens = await refreshTokens(data.refresh_token);

		if(tokens.access_token && tokens.refresh_token) {
			return tokens;
		} else {
			throw constants.ERRORS.AUTHENTICATION;
		}
	} catch (error) {
		return {
			result: false,
			error: error
		}
	}
}


/* Выход */
export async function signout(data) {
	try {
		/* Валидация */
		try {
			await Joi.validate(data, schema.refresh);
		} catch (error) {
			throw constants.ERRORS.DATA;
		}

		let result = await deleteTokens(data.refresh_token);

		if(result) {
			return { result: true }
		} else {
			throw constants.ERRORS.TOKEN;
		}
	} catch (error) {
		return {
			result: false,
			error: error
		}
	}
}
