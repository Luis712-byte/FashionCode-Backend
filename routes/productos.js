const express = require("express");
const router = express.Router();
const db = require("../config/db");
const multer = require("multer");
const path = require("path");

// ✅ Asegurarse de que exista la carpeta uploads
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configuración de multer
const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// ✅ Obtener todos los X9EMPFILE
router.get("/", (req, res) => {
    db.query("SELECT * FROM X9EMPFILE", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ✅ Subir un producto con imagen
router.post("/", upload.array("imagen", 2), (req, res) => {
    console.log("Archivos recibidos:", req.files);
    const { nombre, descripcion, precio, tipo, calificacion, inventario } = req.body;
    const imagen1 = req.files && req.files[0] ? req.files[0].filename : "default-image.jpg";
    const imagen2 = req.files && req.files[1] ? req.files[1].filename : "default-image.jpg";


    if (!nombre || !descripcion || !precio || !tipo || !inventario || !calificacion) {
        return res.status(400).json({ error: "Nombre, tipo, precio, descripción, inventario y calificación son obligatorios" });
    }

    const sql = "INSERT INTO X9EMPFILE (X9FILE_NAME, X9FILE_TYPE, X9FILE_DESCRIPTION, X9FILE_PRICE, X9FILE_RATING, X9FILE_STOCK, X9FILE_IMAGE1, X9FILE_IMAGE2) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [nombre, tipo, descripcion, precio, calificacion, inventario, imagen1, imagen2], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Producto agregado correctamente", id: result.insertId });
    });
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
    const { nombre, descripcion, precio, tipo, calificacion, inventario, imagen } = req.body;

    if (!nombre || !descripcion || !precio || !tipo || !inventario || !calificacion) {
        return res.status(400).json({ error: "Nombre, tipo, precio, descripción, inventario y calificación son obligatorios" });
    }

    const sql = "UPDATE X9EMPFILE SET X9FILE_NAME = ?, X9EMPFILE_TYPE = ?, X9EMPFILE_DESCRIPTION = ?, X9EMPFILE_PRICE = ?, X9EMPFILE_RATING = ?, X9EMPFILE_STOCK = ?, X9EMPFILE_IMAGE = ? WHERE X9FILE_ID = ?";
    db.query(sql, [nombre, tipo, descripcion, precio, calificacion, inventario, imagen, id], (err, result) => {
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
