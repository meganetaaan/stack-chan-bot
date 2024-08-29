import { Hono } from "hono";
import { chat } from "./api/chat";

const app = new Hono();

app.get("/", (c) => {
	return c.html(
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Document</title>
			</head>
			<body>
				<input id="chageMessage" type="text" />
				<button type="button" id="sendButton">
					💬
				</button>
			</body>
		</html>,
	);
});

app.route("/api/v1/chat", chat);

export default app;
