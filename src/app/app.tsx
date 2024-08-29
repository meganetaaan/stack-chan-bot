import { useState, type InputEvent, type MouseEvent } from "hono/jsx";
import { Style } from "hono/css";
import { AskResponse, type AskRequest } from "@api/chat";
import type { Message } from "@services/rag";
import type z from "zod";

type Status = "IDLE" | "THINKING";

export default function App() {
	const [message, setMessage] = useState<string>("");
	const [history, setHistory] = useState<z.infer<typeof Message>[]>([]);
	const [status, setStatus] = useState<Status>("IDLE");

	const handleInputChange = (event: InputEvent) => {
		const value = event.target.value;
		setMessage(value);
	};

	const handleSubmit = async (event: MouseEvent) => {
    console.log("clicked");
		setStatus("THINKING");
		setHistory([
			...history,
			{
				role: "user",
				content: message,
			},
		]);
		const req: z.infer<typeof AskRequest> = {
			message,
		};
		const res = await fetch("/api/v1/chat/ask", {
			method: "POST",
			body: JSON.stringify(req),
		});
		const result = AskResponse.safeParse(res);
		if (result.success) {
			setHistory([
				...history,
				{
					role: "assistant",
					content: result.data.message,
				},
			]);
		} else {
			setHistory([
				...history,
				{
					role: "assistant",
					content: `[Error] ${result.error}`,
				},
			]);
		}
	};
	return (
		<>
			<Style />
			<div>
				<form>
					<input type="text" onChange={handleInputChange} value={message} />
					<button
						disabled={status === "THINKING"}
						type="button"
						onClick={handleSubmit}
					>
						📩
					</button>
					<ul>
						{history.map((message) => (
							<li key={message}>
								{message.role}: {message.content}
							</li>
						))}
					</ul>
				</form>
			</div>
		</>
	);
}