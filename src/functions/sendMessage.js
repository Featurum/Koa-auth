import nodemailer from 'nodemailer'

import env from 'dotenv'

/* Конфигурация */
env.config()

let transporter = nodemailer.createTransport({
  	service: 'Yandex',
  	secureConnection: true,
  	auth: {
    	user: process.env.EMAIL_LOGIN,
    	pass: process.env.EMAIL_PASS
  	}
});

export default async function sendMessage(email, code) {
	let mailOptions = {
		from: `${process.env.SITE_NAME} <${process.env.EMAIL_LOGIN}>`,
		to: email,
		subject: `Ваша учетная запись ${process.env.SITE_NAME} - проверочный код`,
		html: `Ваш проверочный код для авторизации: ${code}`,

		headers: {
	        'Precedence': 'bulk'
	    }
	};

	await transporter.sendMail(mailOptions);
}