const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require('bcrypt');
const multer = require("multer");
const path = require("path");
const bucket = require("../config/firebase");


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ✅ Obtener todos los usuarios
router.get("/", (req, res) => {
    db.query("SELECT * FROM X9EXPMAIN", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ✅ Obtener un usuario por su ID
router.get("/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM X9EXPMAIN WHERE X9_EMAIL = ?", [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(results[0]);
    });
});

// ✅ Crear un usuario (POST)
router.post("/", (req, res) => {
    const {
        X9_DNI,
        X9_NAME,
        X9_LASTNAME,
        X9_PHONE,
        X9_DATE_BIRTH,
        X9_EMERGENCY_CONTACT,
        X9_PHONE_EMERGENCY_CONTACT,
        X9_DATE,
        X9_EMAIL,
        password
    } = req.body;

    if (
        !X9_DNI ||
        !X9_NAME ||
        !X9_LASTNAME ||
        !X9_PHONE ||
        !X9_DATE_BIRTH ||
        !X9_EMERGENCY_CONTACT ||
        !X9_PHONE_EMERGENCY_CONTACT ||
        !X9_DATE ||
        !X9_EMAIL ||
        !password
    ) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    // Cifrar la contraseña
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).json({ error: 'Error al cifrar la contraseña' });
        }

        const checkQuery = "SELECT X9_DNI FROM X9EXPMAIN WHERE X9_DNI = ?";
        db.query(checkQuery, [X9_DNI], (err, results) => {
            if (err) {
                return res.status(500).json({ error: "Error al verificar el DNI" });
            }
            if (results.length > 0) {
                return res.status(409).json({ error: "El DNI ya está registrado" });
            }

            const insertQuery = `
                INSERT INTO X9EXPMAIN (
                    X9_DNI, X9_NAME, X9_LASTNAME, X9_PHONE, X9_DATE_BIRTH,
                    X9_EMERGENCY_CONTACT, X9_PHONE_EMERGENCY_CONTACT, X9_DATE, X9_EMAIL
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            db.query(
                insertQuery,
                [
                    X9_DNI,
                    X9_NAME,
                    X9_LASTNAME,
                    X9_PHONE,
                    X9_DATE_BIRTH,
                    X9_EMERGENCY_CONTACT,
                    X9_PHONE_EMERGENCY_CONTACT,
                    X9_DATE,
                    X9_EMAIL,
                ],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: "Error al insertar el usuario" });
                    }
                }
            );
        });
    });
});


// ✅ Actualizar un usuario (PUT)
router.put("/:id", upload.single("imagen"), async (req, res) => {
    const { id } = req.params;
    const campos = { ...req.body };
    const imagen = req.file;

    // console.log("imagen", imagen);

    if (Object.keys(campos).length === 0 && !imagen) {
        return res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
    }

    try {
        if (imagen) {
            const ext = path.extname(imagen.originalname);
            const filename = `usuarios/${Date.now()}_${id}${ext}`;
            const fileUpload = bucket.file(filename);

            await fileUpload.save(imagen.buffer, {
                contentType: imagen.mimetype,
                public: true,
                metadata: {
                    firebaseStorageDownloadTokens: filename,
                },
            });

            const imagenUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

            campos.X9_IMAGE = imagenUrl;
        }

        const columnas = Object.keys(campos);
        const valores = Object.values(campos);

        let query = "UPDATE X9EXPMAIN SET ";
        columnas.forEach((col, i) => {
            query += `${col} = ?${i < columnas.length - 1 ? ", " : ""}`;
        });
        query += " WHERE X9_EMAIL = ?";
        valores.push(id);

        db.query(query, valores, (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Usuario actualizado", updatedFields: campos });
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Eliminar un usuario (DELETE)
router.delete("/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM X9EXPMAIN WHERE X9_DNI = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Usuario eliminado" });
    });
});

module.exports = router;
