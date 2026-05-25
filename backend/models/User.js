const { getDB } = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
    async create(userData) {
        const db = getDB();
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const user = {
            name: userData.name,
            email: userData.email.toLowerCase(),
            password: hashedPassword,
            createdAt: new Date()
        };

        const result = await db.collection('users').insertOne(user);
        return result;
    },

    async findByEmail(email) {
        const db = getDB();
        return db.collection('users').findOne({ email: email.toLowerCase() });
    },

    async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }
};

module.exports = User;
