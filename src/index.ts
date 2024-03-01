import { plainToClass } from "class-transformer";
import { validateOrReject } from "class-validator";
import dotenv from "dotenv";
import "es6-shim";
import express, { Express, Request, Response } from "express";
import { Pool } from "pg";
import "reflect-metadata";

import { Board } from "./dto/board.dto";
import { User } from "./dto/user.dto";
import { List } from "./dto/list.dto";
import { card } from "./dto/Card.dto";
import { BoardUser } from "./dto/board usuario.dto";
import { CardUser } from "./dto/card user.dto";

dotenv.config();

// Estableciendo un grupo de conexiones a PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: +process.env.DB_PORT!,
});

// Inicializando la aplicación Express
const app: Express = express();

//Configurando el puerto del servidor
const port = process.env.PORT || 3000;

// Agregar middleware para analizar los cuerpos de solicitud JSON
app.use(express.json());

// Manejo de rutas y controladores para gestión de usuarios.

// Recuperando todas las usuarios de la base de datos
app.get("/users", async (req: Request, res: Response) => {
  try {
    const text = "SELECT id, name, email FROM users";
    const result = await pool.query(text);
    res.status(200).json(result.rows);
  } catch (errors) {
    return res.status(400).json(errors);
  }
});

// Creando un nuevo usuario y almacenándolo en la base de datos
app.post("/users", async (req: Request, res: Response) => {
  let userDto: User = plainToClass(User, req.body);
  try {
    await validateOrReject(userDto);

    const text = "INSERT INTO users(name, email) VALUES($1, $2) RETURNING *";
    const values = [userDto.name, userDto.email];
    const result = await pool.query(text, values);
    res.status(201).json(result.rows[0]);
  } catch (errors) {
    return res.status(422).json(errors);
  }
});

// Manejo de rutas y controladores para gestión de tableros

// Recuperando todos los tableros de la base de datos
app.get("/boards", async (req: Request, res: Response) => {
  try {
    const text =
      'SELECT b.id, b.name, bu.userid "adminUserid" FROM boards b JOIN board_users bu ON bu.boardId = b.id WHERE bu.isAdmin IS true';
    const result = await pool.query(text);
    res.status(200).json(result.rows);
  } catch (errors) {
    return res.status(400).json(errors);
  }
});

// Creando un nuevo tablero y asociando un usuario administrador
app.post("/boards", async (req: Request, res: Response) => {
  let boardDto: Board = plainToClass(Board, req.body);
  const client = await pool.connect();
  try {
    client.query("BEGIN");

    await validateOrReject(boardDto, {});

    const boardText = "INSERT INTO boards(name) VALUES($1) RETURNING *";
    const boardValues = [boardDto.name];
    const boardResult = await client.query(boardText, boardValues);

    const boardUserText =
      "INSERT INTO board_users(boardId, userid, isAdmin) VALUES($1, $2, $3)";
    const boardUserValues = [
      boardResult.rows[0].id,
      boardDto.adminUserId,
      true,
    ];
    await client.query(boardUserText, boardUserValues);

    client.query("COMMIT");
    res.status(201).json(boardResult.rows[0]);
  } catch (errors) {
    client.query("ROLLBACK");
    return res.status(422).json(errors);
  } finally {
    client.release();
  }
});

// Manejo de rutas y controladores para asociaciones de tableros de usuarios

// Recuperando todos los usuarios asociados con un tablero específico
app.get("/boards/:boardId/users", async (req: Request, res: Response) => {
  const { boardId } = req.params;
  try {
    const text =
      "SELECT id, isAdmin, userid FROM board_users WHERE boardId = $1";
    const values = [boardId];
    const result = await pool.query(text, values);
    res.status(200).json(result.rows);
  } catch (errors) {
    return res.status(400).json(errors);
  }
});

// Asociar un usuario a un tablero como administrador
app.post("/boards/:boardId/users", async (req: Request, res: Response) => {
  const { boardId } = req.params;
  req.body.boardId = boardId;
  const boardUserDTO: BoardUser = plainToClass(BoardUser, req.body);
  try {
    await validateOrReject(boardUserDTO);
    const { userId, isAdmin } = boardUserDTO;
    const text =
      "INSERT INTO board_users(boardId, userid, isAdmin) VALUES($1, $2, $3) RETURNING *";
    const values = [boardId, userId, isAdmin];
    const result = await pool.query(text, values);
    res.status(201).json(result.rows[0]);
  } catch (errors) {
    return res.status(422).json(errors);
  }
});

// Ruta para obtener todos los usuarios asociados a una tarjeta específica
app.get("/cards/:cardId/users", async (req: Request, res: Response) => {
  const { cardId } = req.params;
  try {
    const text = "SELECT user_id, is_owner FROM card_users WHERE card_id = $1";
    const values = [cardId];
    const result = await pool.query(text, values);
    res.status(200).json(result.rows);
  } catch (errors) {
    return res.status(400).json(errors);
  }
});

// Ruta para asociar un usuario a una tarjeta como propietario
app.post("/cards/:cardId/users", async (req: Request, res: Response) => {
  const { cardId } = req.params;

  // Agregar cardId al cuerpo de la solicitud
  req.body.card_id = cardId;
  const cardUserDto: CardUser = plainToClass(CardUser, req.body);

  try {
    await validateOrReject(cardUserDto);

    const { userid, is_owner } = cardUserDto;
    const text =
      "INSERT INTO card_users(card_id, user_id, is_owner) VALUES($1, $2, $3) RETURNING *";
    const values = [cardId, userid, is_owner];
    const result = await pool.query(text, values);
    res.status(201).json(result.rows[0]);
  } catch (errors) {
    return res.status(422).json(errors);
  }
});

// Manejo de rutas y controladores para gestión de listas.

// Recuperando todas las listas de un tablero específico
app.get("/boards/:boardId/lists", async (req: Request, res: Response) => {
  const { boardId } = req.params;
  try {
    const text = "SELECT id, name FROM lists WHERE board_id = $1";
    const values = [boardId];
    const result = await pool.query(text, values);
    res.status(200).json(result.rows);
  } catch (errors) {
    return res.status(400).json(errors);
  }
});

// Creando una nueva lista para un tablero específico
app.post("/boards/:boardId/lists", async (req: Request, res: Response) => {
  const { boardId } = req.params;
  req.body.board_id = boardId;
  const listDto: List = plainToClass(List, req.body);
  try {
    await validateOrReject(listDto);
    const { name } = listDto;
    const text = "INSERT INTO lists(name, board_id) VALUES($1, $2) RETURNING *";
    const values = [name, boardId];
    const result = await pool.query(text, values);
    res.status(201).json(result.rows[0]);
  } catch (errors) {
    return res.status(422).json(errors);
  }
});
app.get("/lists/:listId/cards", async (req: Request, res: Response) => {
  const { listId } = req.params;
  try {
    const text =
      "SELECT id, title, description, due_date FROM cards WHERE list_id = $1";
    const values = [listId];
    const result = await pool.query(text, values);
    res.status(200).json(result.rows);
  } catch (errors) {
    return res.status(400).json(errors);
  }
});

// Ruta para crear una nueva tarjeta en una lista específica
app.post("/lists/:listId/cards", async (req: Request, res: Response) => {
  const { listId } = req.params;

  // Agregar listId al cuerpo de la solicitud
  req.body.list_id = listId;
  const cardDto: card = plainToClass(card, req.body);

  try {
    await validateOrReject(cardDto);

    const { title, description, due_date } = cardDto;
    const text =
      "INSERT INTO cards(title, description, due_date, list_id) VALUES($1, $2, $3, $4) RETURNING *";
    const values = [title, description, due_date, listId];
    const result = await pool.query(text, values);
    res.status(201).json(result.rows[0]);
  } catch (errors) {
    return res.status(422).json(errors);
  }
});



// Inicio del servidor Express, escuchando en el puerto especificado
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`); // Mensaje de confirmación de inicio del servidor
});