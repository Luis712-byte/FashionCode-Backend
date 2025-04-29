const express = require("express");
const router = express.Router();
const db = require("../config/db");
const multer = require("multer");
const bucket = require("../config/firebase");
const path = require("path");

// ✅ Configurar multer con almacenamiento en memoria
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Obtener todos los X9EMPFILE
router.get("/", (req, res) => {
    db.query("SELECT * FROM X9EMPFILE", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ✅ Subir un producto con imagen
router.post("/", upload.array("imagen", 2), async (req, res) => {
    const { nombre, descripcion, precio, tipo, calificacion, inventario } = req.body;
    const files = req.files;

    if (!nombre || !descripcion || !precio || !tipo || !inventario || !calificacion) {
        return res.status(400).json({ error: "Nombre, tipo, precio, descripción, inventario y calificación son obligatorios" });
    }

    try {
        const urls = await Promise.all(
            files.map(async (file, index) => {
                const ext = path.extname(file.originalname);
                const filename = `productos/${Date.now()}_${index}${ext}`;
                const fileUpload = bucket.file(filename);

                await fileUpload.save(file.buffer, {
                    contentType: file.mimetype,
                    public: true,
                    metadata: {
                        firebaseStorageDownloadTokens: filename,
                    },
                });

                return `https://storage.googleapis.com/${bucket.name}/${filename}`;
            })
        );

        const imagen1 = urls[0] || "default-image.jpg";
        const imagen2 = urls[1] || "default-image.jpg";

        const sql = "INSERT INTO X9EMPFILE (X9FILE_NAME, X9FILE_TYPE, X9FILE_DESCRIPTION, X9FILE_PRICE, X9FILE_RATING, X9FILE_STOCK, X9FILE_IMAGE1, X9FILE_IMAGE2) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        db.query(sql, [nombre, tipo, descripcion, precio, calificacion, inventario, imagen1, imagen2], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Producto agregado correctamente", id: result.insertId });
        });

    } catch (err) {
        console.error("Error subiendo imágenes:", err);
        res.status(500).json({ error: "Error subiendo imágenes" });
    }
});

// ✅ Obtener un producto por ID
router.get("/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM X9EMPFILE WHERE X9FILE_ID = ?", [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "Producto no encontrado" });
        res.json(results[0]);
    });
});

// ✅ Actualizar un producto (Update)
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, tipo, calificacion, inventario, /*imagen1, image2*/ } = req.body;

    if (!nombre || !descripcion || !precio || !tipo || !inventario || !calificacion) {
        return res.status(400).json({ error: "Nombre, tipo, precio, descripción, inventario y calificación son obligatorios" });
    }

    const sql = "UPDATE X9EMPFILE SET X9FILE_NAME = ?, X9FILE_TYPE = ?, X9FILE_DESCRIPTION = ?, X9FILE_PRICE = ?, X9FILE_RATING = ?, X9FILE_STOCK = ? WHERE X9FILE_ID = ?";
    db.query(sql, [nombre, tipo, descripcion, precio, calificacion, inventario, /*imagen1, image2,*/ id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Producto no encontrado" });
        res.json({ message: "Producto actualizado correctamente" });
    });
});

// ✅ Eliminar un producto (Delete)
router.delete("/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM X9EMPFILE WHERE X9FILE_ID = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Producto no encontrado" });
        res.json({ message: "Producto eliminado correctamente" });
    });
});

module.exports = router;
