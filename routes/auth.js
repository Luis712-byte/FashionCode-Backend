const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;

router.get('/', (req, res) => {
    res.json({ message: "Ruta de login activa" });
});

router.post('/user', (req, res) => {
    const { email } = req.body;  

    if (!email) {
        return res.status(400).json({ error: 'Email es requerido' });
    }

    const sqlVault = 'SELECT * FROM X9EXPVAULT WHERE X9VAULT_EMAIL = ?'; 
    db.query(sqlVault, [email], (err, vaultResults) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (vaultResults.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = vaultResults[0];
        return res.json({
            JWT: user.X9VAULT_PASSWORD,  
        });
    });
});


router.post('/', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const sqlVault = 'SELECT * FROM X9EXPVAULT WHERE X9VAULT_EMAIL = ?';
    db.query(sqlVault, [email], async (err, vaultResults) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (vaultResults.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado. Intenta con otro.' });
        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ error: 'Error al cifrar la contraseña' });
            }
            const sqlInsertVault = 'INSERT INTO X9EXPVAULT (X9VAULT_EMAIL, X9VAULT_PASSWORD) VALUES (?, ?)';
            db.query(sqlInsertVault, [email, hashedPassword], (err, insertResult) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                const sqlInsertMain = 'INSERT IGNORE INTO X9EXPMAIN (X9_EMAIL) VALUES (?)';
                db.query(sqlInsertMain, [email], (err, mainResult) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '2h' });
                    return res.json({ message: 'Usuario registrado y autenticado exitosamente', token });
                });
            });
        });
    });
});

module.exports = router;
