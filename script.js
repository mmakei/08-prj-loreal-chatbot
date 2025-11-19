/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const currentQuestion = document.getElementById("currentQuestion");

const WORKER_URL = "https://falling-band-37d2.mmakei.workers.dev";

/*
  Conversation history for OpenAI.
  We start with a system message that:
  - Explains the bot’s role (L'Oréal beauty advisor)
  - Limits answers to L'Oréal / beauty topics only
*/
const messages = [
  {
    role: "system",
    content: `
You are "L'Oréal Smart Product & Routine Advisor", a friendly beauty assistant.

- You ONLY answer questions related to L'Oréal products, brands, ingredients, routines, skin concerns, hair concerns, makeup, and fragrance.
- You stay within the L'Oréal family of brands (for example: L'Oréal Paris, Maybelline New York, Garnier, CeraVe, NYX Professional Makeup, etc.).
- If a question is NOT about beauty or L'Oréal, politely refuse and explain that you can only help with L'Oréal beauty questions.
- Keep answers clear and beginner-friendly.
- You can suggest example routines (AM / PM) but avoid medical claims; suggest seeing a dermatologist for serious issues.
- Use a warm, encouraging tone and occasional emojis (1–2 per answer).
`.trim(),
  },
];

/* Helper: add a message bubble to the chat window */
function addMessage(role, text) {
  const msg = document.createElement("div");
  msg.classList.add("msg");

  // `role` will be "user" or "assistant"
  if (role === "user") {
    msg.classList.add("user");
  } else {
    msg.classList.add("ai");
  }

  msg.textContent = text;
  chatWindow.appendChild(msg);

  // Scroll to bottom after adding a new message
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Helper: quick client-side check to see if message sounds beauty-related */
function isBeautyRelated(text) {
  const lower = text.toLowerCase();
  const keywords = [
    "skin",
    "skincare",
    "serum",
    "moisturizer",
    "cleanser",
    "toner",
    "spf",
    "sunscreen",
    "acne",
    "pore",
    "hyperpigmentation",
    "dark spot",
    "hair",
    "shampoo",
    "conditioner",
    "mask",
    "makeup",
    "foundation",
    "concealer",
    "mascara",
    "lipstick",
    "fragrance",
    "perfume",
    "routine",
    "l'oreal",
    "loreal",
    "maybelline",
    "garnier",
    "cerave",
    "nyx",
  ];

  return keywords.some((keyword) => lower.includes(keyword));
}

/* Helper: send current messages array to your Cloudflare Worker */
async function fetchChatCompletion() {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // Cloudflare note: we send { messages: [...] }
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`Worker error: ${response.status}`);
  }

  const data = await response.json();

  // We expect: data.choices[0].message.content
  const reply =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;

  if (!reply) {
    throw new Error("No message content returned from API");
  }

  return reply.trim();
}

/* Handle form submit */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userText = userInput.value.trim();
  if (!userText) return;

  // Clear the input
  userInput.value = "";

  // Add user message to UI and to messages array
  addMessage("user", userText);
  messages.push({ role: "user", content: userText });

  // LevelUp: show the last question above the response
  currentQuestion.textContent = `You asked: ${userText}`;

  // If message is clearly not beauty-related, answer locally
  if (!isBeautyRelated(userText)) {
    const offTopicReply =
      "I’m here just to help with L'Oréal products, beauty routines, and related questions. 💄\n\n" +
      "Try asking me about skincare, makeup, haircare, or fragrance!";
    addMessage("assistant", offTopicReply);
    messages.push({ role: "assistant", content: offTopicReply });
    return;
  }

  // Optional: show a temporary "thinking" message
  const thinkingText = "Thinking about your routine… ✨";
  addMessage("assistant", thinkingText);
  const tempIndex = messages.length;
  messages.push({ role: "assistant", content: thinkingText });

  try {
    const reply = await fetchChatCompletion();

    // Replace the temporary "thinking" bubble with the real answer:
    // simplest approach: add a new answer and let the thinking one scroll up.
    addMessage("assistant", reply);
    messages.push({ role: "assistant", content: reply });
  } catch (error) {
    console.error(error);
    const errorReply =
      "Oops, something went wrong talking to my beauty brain. Please try again in a moment.";
    addMessage("assistant", errorReply);
    messages.push({ role: "assistant", content: errorReply });
  }
});

/* Initial welcome message when the page loads */
window.addEventListener("load", () => {
  const welcome =
    "Bonjour! I’m your L'Oréal Smart Product & Routine Advisor ✨\n\n" +
    "Ask me about L'Oréal skincare, makeup, haircare, or help building a routine.";
  addMessage("assistant", welcome);
  messages.push({ role: "assistant", content: welcome });
});
