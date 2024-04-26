const { DynamicTool } = require("@langchain/core/tools");
const { TavilySearchResults } = require("@langchain/community/tools/tavily_search");
const { AgentExecutor, createReactAgent } = require("langchain/agents");
const { pull } = require("langchain/hub");
const { Cohere } = require("@langchain/cohere");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { DuckDuckGoSearch } = require("@langchain/community/tools/duckduckgo_search");

const tavily_search = new TavilySearchResults({
  maxResults: 1,
  search: async (query) => {
    console.log("Using TavilySearchResults tool.");
    return TavilySearchResults.prototype.search.call(this, query);
  }
});

const get_weather = new DynamicTool({
  name: "get_weather",
  description: "Returns the weather of a place.",
  func: async (input) => {
    console.log("Getting Weather.")
    const url = `https://wttr.in/${input}?format=j1`;
    const response = await fetch(url);
    const data = await response.json();
    return data["current_condition"];
  },
});

const get_date_and_time = new DynamicTool({
  name: "get_date_and_time",
  description: "Returns the current date and time.",
  func: async () => {
    console.log("Getting Time.");
    return new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  },
});

const duck_duck_go_search = new DuckDuckGoSearch({
  maxResults: 1,
  search: async (query) => {
    console.log("Using DuckDuckGoSearch tool.");
    return DuckDuckGoSearch.prototype.search.call(this, query);
  }
});

const generate_image = new DynamicTool({
  name: "generate_image",
  description: "Generates an image from a prompt, and returns the image link.",
  func: async (input) => {
    console.log("Generating Image with prompt:", input);
    return "https://i.imgur.com/6uUllWu.jpeg";
  },
})

const tools = [tavily_search, get_weather, get_date_and_time, duck_duck_go_search, generate_image];

async function setupAndExecute() {
  // const prompt = await pull("hwchase17/react");

  const systemTemplate = `Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemTemplate],
    ["human", "hi! my name is antonin."],
    ["assistant", "Hello Antonin! How can I assist you today?"],
    // ["human", humanTemplate],
  ]);

  const llm = new Cohere({
    model: "command-r-plus",
    temperature: 0,
  });

  const agent = await createReactAgent({
    llm,
    tools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  });

  const result = await agentExecutor.invoke({
    input: "what is the weather in paris night now?",
  });

  console.log(result);

  // const eventStream = await agentExecutor.streamEvents(
  //   {
  //     input: "what is the weather in paris night now?",
  //   },
  //   { version: "v1" }
  // );

  // for await (const event of eventStream) {
  //   const eventType = event.event;
    // if (eventType === "on_chain_start") {
    //   // Was assigned when creating the agent with `.withConfig({"runName": "Agent"})` above
    //   if (event.name === "Agent") {
    //     console.log("\n-----");
    //     console.log(
    //       `Starting agent: ${event.name} with input: ${JSON.stringify(
    //         event.data.input
    //       )}`
    //     );
    //   }
    // } else if (eventType === "on_chain_end") {
    //   // Was assigned when creating the agent with `.withConfig({"runName": "Agent"})` above
    //   if (event.name === "Agent") {
    //     console.log("\n-----");
    //     console.log(`Finished agent: ${event.name}\n`);
    //     console.log(`Agent output was: ${event.data.output}`);
    //     console.log("\n-----");
    //   }
    // } else if (eventType === "on_llm_stream") {
    //   const content = event.data?.chunk?.message?.content;
    //   // Empty content in the context of OpenAI means
    //   // that the model is asking for a tool to be invoked via function call.
    //   // So we only print non-empty content
    //   if (content !== undefined && content !== "") {
    //     console.log(`| ${content}`);
    //   }
    // } else if (eventType === "on_tool_start") {
    //   console.log("\n-----");
    //   console.log(
    //     `Starting tool: ${event.name} with inputs: ${event.data.input}`
    //   );
    // } else if (eventType === "on_tool_end") {
    //   console.log("\n-----");
    //   console.log(`Finished tool: ${event.name}\n`);
    //   console.log(`Tool output was: ${event.data.output}`);
    //   console.log("\n-----");
    // } else {
    //   console.log(event);
    // }
  // }
}

console.log("started");

setupAndExecute();
