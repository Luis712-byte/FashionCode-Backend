require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");
const usuariosRoutes = require("./routes/usuarios");
const productosRoutes = require("./routes/productos");
const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.get("/", (req, res) => res.send("¡Servidor funcionando!"));
app.use("/usuarios", usuariosRoutes);
app.use("/productos", productosRoutes);
app.use("/login", authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    if (process.env.NODE_ENV !== "production") {
        console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    } else {
        console.log("🚀 Servidor corriendo en producción");
    }
});
