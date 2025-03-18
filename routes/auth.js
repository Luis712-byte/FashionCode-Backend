const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY;


router.get('/', (req, res) => {
    res.json({ message: "Ruta de login activa" });
});

router.post('/', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }


    const sqlUser = 'SELECT * FROM x9expmain WHERE X9_EMAIL = ?';
    db.query(sqlUser, [email], (err, userResults) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (userResults.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const user = userResults[0];
        const userDNI = user.X9_DNI;

        const sqlCred = 'SELECT X9VAULT_PASSWORD FROM X9EXPVAULT WHERE X9_DNI = ?';
        db.query(sqlCred, [userDNI], async (err, credResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (credResults.length === 0) {
                return res.status(401).json({ error: 'Credenciales no encontradas' });
            }

            const hashedPassword = credResults[0].X9VAULT_PASSWORD;

            const match = await bcrypt.compare(password, hashedPassword);
            if (!match) {
                return res.status(401).json({ error: 'Contraseña incorrecta' });
            }

            const token = jwt.sign(
                {
                    dni: user.X9_DNI,
                    email: user.X9_EMAIL,
                    name: user.X9_NAME
                },
                SECRET_KEY,
                { expiresIn: '2h' }
            );

            res.json({ message: 'Inicio de sesión exitoso', token });
        });
    });
});

module.exports = router;
