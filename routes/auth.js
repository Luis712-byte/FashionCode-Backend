const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// ✅ Clave secreta para JWT
const SECRET_KEY = process.env.SECRET_KEY;

// ✅ Ruta de prueba
router.get('/', (req, res) => {
    res.json({ message: "Ruta de login activa" });
});

// ✅ Ruta para obtener contraseña por usuario
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

// ✅ Ruta para iniciar session
router.post('/signin', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const sql = 'SELECT * FROM X9EXPVAULT WHERE X9VAULT_EMAIL = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error en el servidor' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = results[0];

        const match = await bcrypt.compare(password, user.X9VAULT_PASSWORD);
        if (!match) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign({ email: user.X9VAULT_EMAIL }, SECRET_KEY, { expiresIn: '2h' });

        return res.json({ message: 'Inicio de sesión exitoso', token });
    });
});

// ✅ Ruta para registrar usuario
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

                    const htmlContent = ` <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                    <div style="
                        max-width: 600px;
                        margin: auto;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        background: url('https://th.bing.com/th/id/R.f6707bcc34d28dddfabdc6a2b0e60d95?rik=vnLu2qIlI4PbHA&pid=ImgRaw&r=0');
                        background-size: contain;
                    ">
                        <div style="background: rgba(255, 255, 255, 0.9); padding: 20px; border-radius: 8px;">
                            <h2 style="color: #2c3e50; text-align: center;">¡Bienvenido a FashionCode!</h2>
                            <p style="font-size: 16px; color: #555; text-align: center;">
                                Gracias por registrarte en nuestra tienda de moda. Estamos emocionados de que seas parte de nuestra
                                comunidad.
                            </p>
                            <div style="text-align: center; margin: 20px 0;">
                                <a href="https://fashion-code-rouge.vercel.app/"
                                    style="display: inline-block; background: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                                    Explorar Tienda
                                </a>
                            </div>
                            <p style="font-size: 14px; color: #777; text-align: center;">
                                Si no has solicitado este correo, puedes ignorarlo.
                            </p>
                        </div>
                    </div>
                </div>`;

                    enviarCorreo(email, 'Bienvenido a nuestra plataforma', htmlContent)
                        .then(() => {
                            return res.json({
                                message: 'Usuario registrado y autenticado exitosamente. Correo enviado correctamente.',
                                token
                            });
                        })
                        .catch(error => {
                            console.error('Error enviando correo:', error);
                            return res.status(500).json({
                                message: 'Usuario registrado, pero hubo un error al enviar el correo.',
                                error: error.message,
                                token
                            });
                        });
                    // return res.json({ message: 'Usuario registrado y autenticado exitosamente', token });
                });
            });
        });
    });
});

// ✅ Ruta: Solicitar enlace para restablecer contraseña
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'El email es requerido' });
    }

    const sql = 'SELECT * FROM X9EXPVAULT WHERE X9VAULT_EMAIL = ?';
    db.query(sql, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '15m' });

        const resetLink = `http://${process.env.FRONTEND_URL}/reset-password/${token}`;

        const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 40px;">
            <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px;">
            <h2 style="color: #333;">🔐 Recuperación de contraseña</h2>
            <p style="color: #555;">Hola,</p>
            <p style="color: #555;">Recibimos una solicitud para restablecer tu contraseña. Para continuar, haz clic en el botón a continuación:</p>
            <div style="text-align: center; margin: 30px 0;">
             <a href="${resetLink}" style="background-color: #e91e63; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer contraseña</a>
            </div>
            <p style="color: #777; font-size: 14px;">⚠️ Este enlace expirará en 15 minutos por razones de seguridad.</p>
            <p style="color: #777; font-size: 14px;">Si no realizaste esta solicitud, puedes ignorar este mensaje. Tu contraseña actual seguirá siendo válida.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #bbb; font-size: 12px; text-align: center;">Este es un mensaje automático. Por favor, no respondas a este correo.</p>
            </div>
        </div>
        `;


        enviarCorreo(email, 'Restablece tu contraseña en FashionCode', htmlContent)
            .then(response => {
                return res.json({ message: 'Correo de restablecimiento enviado exitosamente.' });
            })
            .catch(err => {
                return res.status(500).json({ error: 'Error al enviar el correo.' });
            });
    });
});


// ✅ Ruta: Restablecer contraseña
router.post('/reset-password', (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(400).json({ error: 'Token inválido o expirado' });
        }

        const { email } = decoded;

        bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ error: 'Error al cifrar la contraseña' });
            }

            const sqlUpdate = 'UPDATE X9EXPVAULT SET X9VAULT_PASSWORD = ? WHERE X9VAULT_EMAIL = ?';
            db.query(sqlUpdate, [hashedPassword, email], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                return res.json({ message: 'Contraseña actualizada correctamente' });
            });
        });
    });
});

// ✅ Ruta para enviar correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function enviarCorreo(destinatario, asunto, htmlContent) {
    try {
        const info = await transporter.sendMail({
            from: '"FashionCode Soporte" <no-reply@fashioncode.com>',
            to: destinatario,
            subject: asunto,
            text: 'Gracias por registrarte en FashionCode. ¡Esperamos verte pronto!',
            html: htmlContent,
        });

        console.log('Correo enviado con éxito: ' + info.messageId);
        return { success: true, message: 'Correo enviado correctamente' };
    } catch (error) {
        console.error('Error enviando correo:', error);
        return { success: false, message: 'Error al enviar correo', error };
    }
}


module.exports = router;
