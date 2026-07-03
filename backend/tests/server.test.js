const request = require("supertest");

// ─── Mock ANTES de importar app ───────────────────────────────
const mockQuery = jest.fn();

jest.mock("mysql2/promise", () => ({
  createPool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

const app = require("../server");

// ─── Tests ────────────────────────────────────────────────────

describe("GET /api/health", () => {
  it("debe retornar status 200 y status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("GET /api/productos", () => {
  it("debe retornar lista de productos", async () => {
    mockQuery.mockResolvedValueOnce([
      [
        { id: 1, nombre: "Croquetas", descripcion: "Alimento seco", precio: 5000, stock: 10 },
        { id: 2, nombre: "Snack", descripcion: "Premio", precio: 2000, stock: 20 },
      ],
    ]);

    const res = await request(app).get("/api/productos");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("debe retornar 500 si falla la BD", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).get("/api/productos");
    expect(res.statusCode).toBe(500);
  });
});

describe("GET /api/productos/:id", () => {
  it("debe retornar un producto por ID", async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, nombre: "Croquetas", descripcion: "Alimento seco", precio: 5000, stock: 10 }],
    ]);

    const res = await request(app).get("/api/productos/1");
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it("debe retornar 404 si no existe el producto", async () => {
    mockQuery.mockResolvedValueOnce([[]]); // vacío

    const res = await request(app).get("/api/productos/999");
    expect(res.statusCode).toBe(404);
  });
});

describe("POST /api/productos", () => {
  it("debe crear un producto correctamente", async () => {
    mockQuery
      .mockResolvedValueOnce([{ insertId: 3 }])
      .mockResolvedValueOnce([
        [{ id: 3, nombre: "Hueso", descripcion: "Premio", precio: 1500, stock: 5 }],
      ]);

    const res = await request(app)
      .post("/api/productos")
      .send({ nombre: "Hueso", descripcion: "Premio", precio: 1500, stock: 5 });

    expect(res.statusCode).toBe(201);
    expect(res.body.nombre).toBe("Hueso");
  });

  it("debe retornar 400 si faltan campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/productos")
      .send({ descripcion: "Sin nombre ni precio" });

    expect(res.statusCode).toBe(400);
  });
});

describe("PUT /api/productos/:id", () => {
  it("debe actualizar un producto existente", async () => {
    mockQuery
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([
        [{ id: 1, nombre: "Croquetas Premium", descripcion: "Mejorado", precio: 6000, stock: 8 }],
      ]);

    const res = await request(app)
      .put("/api/productos/1")
      .send({ nombre: "Croquetas Premium", descripcion: "Mejorado", precio: 6000, stock: 8 });

    expect(res.statusCode).toBe(200);
    expect(res.body.nombre).toBe("Croquetas Premium");
  });

  it("debe retornar 404 si el producto no existe", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .put("/api/productos/999")
      .send({ nombre: "No existe", precio: 100, stock: 1 });

    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /api/productos/:id", () => {
  it("debe eliminar un producto correctamente", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app).delete("/api/productos/1");
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Producto eliminado correctamente.");
  });

  it("debe retornar 404 si el producto no existe", async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app).delete("/api/productos/999");
    expect(res.statusCode).toBe(404);
  });
});

module.exports.closeServer = (server) => server.close();