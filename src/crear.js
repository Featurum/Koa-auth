import schedule from 'node-schedule';
import db from './functions/db.js'
 
/* Запуск задачи каждый час */
schedule.scheduleJob('* 0 * * * *', function(){
	let thisTime = new Date()

	/* Удаление просроченных токенов */
	db.query('DELETE FROM registration WHERE exptime <= $1 OR exptime IS NULL', thisTime)

	/* Удаление просроченных заявок на регистрацию */
	db.query('DELETE FROM tokens WHERE exptime <= $1 OR exptime IS NULL', thisTime)
});