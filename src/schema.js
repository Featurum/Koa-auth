import Joi from 'joi'

const task = Joi.object().keys({
	email: 			Joi.string().required().email({ minDomainAtoms: 2 }),
})

const check = Joi.object().keys({
	email: 			Joi.string().required().email({ minDomainAtoms: 2 }),
	code:			Joi.string().required().min(3).max(64)
})

const refresh = Joi.object().keys({
	refresh_token:	Joi.string().required()
})

const logout = Joi.object().keys({
	refresh_token:	Joi.string().required()
})

export default { task, check, refresh, logout }