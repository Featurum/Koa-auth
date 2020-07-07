/* Ошибки запросов */
const ERRORS = {
    DATA: {
        code: 'AUTH_1',
        text: 'Введены некоректные данные'
    },
    DATA_BASE: {
        code: 'AUTH_2',
        text: 'Произошла ошибка, попробуйте позже'
    },
    AUTHENTICATION: {
        code: 'AUTH_3',
        text: 'Ошибка аутентификации, попробуйте снова'
    },
    TOKEN: {
        code: 'AUTH_4',
        text: 'Токен недействителен'
    },
    LIMIT: {
        code: 'AUTH_5',
        text: 'Слишком частые запросы'
    },
    EMAIL: {
        code: 'AUTH_6',
        text: 'Заявки с таким почтовым адресом не существует'
    },
    CODE: {
        code: 'AUTH_7',
        text: 'Неверный код'
    },
    SENG_CODE: {
        code: 'AUTH_8',
        text: 'Ошибка при отправке проверочного кода'
    }
};

export default {
    ERRORS
};