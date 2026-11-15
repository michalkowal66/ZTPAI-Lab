const errorResponse = (description) => ({
  description,
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/Error" } },
  },
});

const jsonBody = (ref) => ({
  required: true,
  content: {
    "application/json": { schema: { $ref: `#/components/schemas/${ref}` } },
  },
});

const jsonOk = (description, schema) => ({
  description,
  content: { "application/json": { schema } },
});

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (name) => ({ type: "array", items: ref(name) });

const idPathParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer", minimum: 1 },
};

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Room Booking API",
    version: "1.0.0",
    description:
      "API rezerwacji sal z uwierzytelnianiem JWT i kontrolą dostępu opartą na rolach.",
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Auth", description: "Rejestracja, logowanie, dane konta" },
    { name: "Buildings", description: "Budynki" },
    { name: "Rooms", description: "Sale" },
    { name: "Reservations", description: "Rezerwacje" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    responses: {
      BadRequest: errorResponse("Błąd walidacji danych wejściowych (400)"),
      Unauthorized: errorResponse("Brak lub nieprawidłowy token (401)"),
      Forbidden: errorResponse("Brak uprawnień do operacji (403)"),
      NotFound: errorResponse("Zasób nie istnieje (404)"),
      Conflict: errorResponse("Konflikt stanu zasobu (409)"),
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "requestId"],
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Validation failed" },
              details: {
                type: "array",
                nullable: true,
                items: {
                  type: "object",
                  properties: {
                    location: { type: "string" },
                    field: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
              requestId: { type: "string", example: "a1b2c3d4-..." },
            },
          },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "jan.kowalski@example.com",
          },
          password: {
            type: "string",
            minLength: 10,
            maxLength: 72,
            example: "bardzo-dlugie-haslo",
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "admin@example.com",
          },
          password: { type: "string", example: "admin-password-123" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          tokenType: { type: "string", example: "Bearer" },
          expiresIn: { type: "string", example: "15m" },
        },
      },
      UserResponse: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["USER", "ADMIN"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CreateBuildingRequest: {
        type: "object",
        required: ["name", "address"],
        properties: {
          name: { type: "string", example: "Budynek A" },
          address: { type: "string", example: "ul. Główna 1" },
        },
      },
      UpdateBuildingRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          name: { type: "string" },
          address: { type: "string" },
        },
      },
      BuildingResponse: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          address: { type: "string" },
          roomsCount: { type: "integer", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CreateRoomRequest: {
        type: "object",
        required: ["buildingId", "name", "capacity"],
        properties: {
          buildingId: { type: "integer", example: 1 },
          name: { type: "string", example: "101" },
          capacity: { type: "integer", minimum: 1, example: 10 },
        },
      },
      UpdateRoomRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          buildingId: { type: "integer" },
          name: { type: "string" },
          capacity: { type: "integer", minimum: 1 },
        },
      },
      RoomResponse: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          capacity: { type: "integer" },
          building: {
            type: "object",
            properties: { id: { type: "integer" }, name: { type: "string" } },
          },
          createdAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      CreateReservationRequest: {
        type: "object",
        required: ["roomId", "participants", "startTime", "endTime"],
        properties: {
          roomId: { type: "integer", example: 1 },
          participants: { type: "integer", minimum: 1, example: 4 },
          startTime: {
            type: "string",
            format: "date-time",
            example: "2029-05-01T10:00:00Z",
          },
          endTime: {
            type: "string",
            format: "date-time",
            example: "2029-05-01T11:00:00Z",
          },
        },
      },
      ReservationResponse: {
        type: "object",
        properties: {
          id: { type: "integer" },
          room: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
              building: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  name: { type: "string" },
                },
              },
            },
          },
          user: {
            type: "object",
            properties: {
              id: { type: "integer" },
              email: { type: "string", format: "email" },
            },
          },
          participants: { type: "integer" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["CONFIRMED", "CANCELLED"] },
          createdAt: { type: "string", format: "date-time" },
          cancelledAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ReservationListResponse: {
        type: "object",
        properties: {
          data: arrayOf("ReservationResponse"),
          meta: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Rejestracja użytkownika",
        security: [],
        requestBody: jsonBody("RegisterRequest"),
        responses: {
          201: jsonOk("Użytkownik utworzony", ref("UserResponse")),
          400: { $ref: "#/components/responses/BadRequest" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Logowanie, zwraca token JWT",
        security: [],
        requestBody: jsonBody("LoginRequest"),
        responses: {
          200: jsonOk("Zalogowano", ref("LoginResponse")),
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Dane zalogowanego użytkownika",
        responses: {
          200: jsonOk("Dane użytkownika", ref("UserResponse")),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/buildings": {
      get: {
        tags: ["Buildings"],
        summary: "Lista budynków",
        responses: {
          200: jsonOk("Lista budynków", arrayOf("BuildingResponse")),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Buildings"],
        summary: "Utwórz budynek",
        requestBody: jsonBody("CreateBuildingRequest"),
        responses: {
          201: jsonOk("Budynek utworzony", ref("BuildingResponse")),
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/buildings/{id}": {
      get: {
        tags: ["Buildings"],
        summary: "Szczegóły budynku",
        parameters: [idPathParam],
        responses: {
          200: jsonOk("Budynek", ref("BuildingResponse")),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Buildings"],
        summary: "Edytuj budynek",
        parameters: [idPathParam],
        requestBody: jsonBody("UpdateBuildingRequest"),
        responses: {
          200: jsonOk("Budynek zaktualizowany", ref("BuildingResponse")),
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Buildings"],
        summary: "Usuń budynek",
        parameters: [idPathParam],
        responses: {
          204: { description: "Budynek usunięty" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/buildings/{id}/rooms": {
      get: {
        tags: ["Buildings"],
        summary: "Sale w budynku",
        parameters: [idPathParam],
        responses: {
          200: jsonOk("Lista sal", arrayOf("RoomResponse")),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/rooms": {
      get: {
        tags: ["Rooms"],
        summary: "Lista sal",
        responses: {
          200: jsonOk("Lista sal", arrayOf("RoomResponse")),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Rooms"],
        summary: "Utwórz salę",
        requestBody: jsonBody("CreateRoomRequest"),
        responses: {
          201: jsonOk("Sala utworzona", ref("RoomResponse")),
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/rooms/{id}": {
      get: {
        tags: ["Rooms"],
        summary: "Szczegóły sali",
        parameters: [idPathParam],
        responses: {
          200: jsonOk("Sala", ref("RoomResponse")),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Rooms"],
        summary: "Edytuj salę",
        parameters: [idPathParam],
        requestBody: jsonBody("UpdateRoomRequest"),
        responses: {
          200: jsonOk("Sala zaktualizowana", ref("RoomResponse")),
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Rooms"],
        summary: "Usuń salę",
        parameters: [idPathParam],
        responses: {
          204: { description: "Sala usunięta" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/reservations": {
      get: {
        tags: ["Reservations"],
        summary: "Lista rezerwacji",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: "sort",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "startTime",
                "-startTime",
                "createdAt",
                "-createdAt",
                "participants",
                "-participants",
              ],
              default: "-startTime",
            },
          },
          {
            name: "roomId",
            in: "query",
            schema: { type: "integer", minimum: 1 },
          },
          {
            name: "buildingId",
            in: "query",
            schema: { type: "integer", minimum: 1 },
          },
          {
            name: "userId",
            in: "query",
            description: "Filtr działa tylko dla ADMINa; dla USERa ignorowany",
            schema: { type: "integer", minimum: 1 },
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["CONFIRMED", "CANCELLED"] },
          },
          {
            name: "from",
            in: "query",
            schema: { type: "string", format: "date-time" },
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string", format: "date-time" },
          },
        ],
        responses: {
          200: jsonOk("Lista rezerwacji", ref("ReservationListResponse")),
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Reservations"],
        summary: "Utwórz rezerwację",
        requestBody: jsonBody("CreateReservationRequest"),
        responses: {
          201: jsonOk("Rezerwacja utworzona", ref("ReservationResponse")),
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/reservations/{id}": {
      get: {
        tags: ["Reservations"],
        summary: "Szczegóły rezerwacji",
        parameters: [idPathParam],
        responses: {
          200: jsonOk("Rezerwacja", ref("ReservationResponse")),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/reservations/{id}/cancel": {
      patch: {
        tags: ["Reservations"],
        summary: "Anuluj rezerwację",
        parameters: [idPathParam],
        responses: {
          200: jsonOk("Rezerwacja anulowana", ref("ReservationResponse")),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
  },
};

module.exports = openapi;
