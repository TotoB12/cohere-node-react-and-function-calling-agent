const {
  TavilySearchResults,
} = require("@langchain/community/tools/tavily_search");
const {
  DuckDuckGoSearch,
} = require("@langchain/community/tools/duckduckgo_search");
const {
  WikipediaQueryRun,
} = require("@langchain/community/tools/wikipedia_query_run");
const { get } = require("axios");
const { DynamicTool } = require("@langchain/core/tools");
const { AgentExecutor, createReactAgent } = require("langchain/agents");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { Cohere } = require("@langchain/cohere");

async function setupAndExecute() {
  const get_weather = new DynamicTool({
    name: "get_weather",
    description: "Returns the weather of a place.",
    func: async (input) => {
      try {
        const geocodingUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${input}&limit=1&appid=${process.env['OPENWEATHER_API_KEY']}`;
        const geocode = await get(geocodingUrl);

        const { lat, lon } = geocode.data[0];
        console.log(lat, lon);

        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env['OPENWEATHER_API_KEY']}`;
        const weather = await get(weatherUrl);

        const weatherData = JSON.stringify(weather.data);

        return weatherData;
      } catch (error) {
        console.error(error);
        return null;
      }
    },
  });

  const get_date_and_time = new DynamicTool({
    name: "get_date_and_time",
    description: "Returns the current date and time.",
    func: async () => {
      const options = {
        weekday: 'long', 
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        // second: 'numeric', 
        timeZone: "America/New_York"
      };
      const date_time = new Date().toLocaleString("en-US", options);
      console.log(date_time);
      return date_time;
    },
  });

  const tools = [
    new TavilySearchResults({ maxResults: 1 }),
    new DuckDuckGoSearch({ maxResults: 1 }),
    new WikipediaQueryRun({ topKResults: 3, maxDocContentLength: 4000 }),
    get_weather,
    get_date_and_time,
  ];

  // https://smith.langchain.com/hub/hwchase17/react
  // const prompt = await pull("hwchase17/react");

  const systemTemplate = `Answer the following questions as best you can. It is currently the {date_time}. You have access to the following tools:

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

Thought:{agent_scratchpad}`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemTemplate],
    ["human", "hi! my name is antonin."],
    ["ai", "Hello Antonin! How can I assist you today?"],
    ["human", "what day is it?"],
  ]);

  const llm = new Cohere({
    model: "command-r-plus",
    temperature: 0.2,
    streaming: true,
  });

  const agent = await createReactAgent({
    llm,
    tools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  }).withConfig({ runName: "Agent" });

  // const result = await agentExecutor.invoke();

  const eventStream = await agentExecutor.streamEvents(
    {
      input: "",
      date_time: new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
    },
    { version: "v1" },
  );

  // console.log(result);
  for await (const event of eventStream) {
    const eventType = event.event;
    if (eventType === "on_chain_start") {
      // Was assigned when creating the agent with `.withConfig({"runName": "Agent"})` above
      if (event.name === "Agent") {
        console.log("\n-----");
        console.log(
          `Starting agent: ${event.name} with input: ${JSON.stringify(
            event.data.input,
          )}`,
        );
      }
    } else if (eventType === "on_chain_end") {
      // Was assigned when creating the agent with `.withConfig({"runName": "Agent"})` above
      if (event.name === "Agent") {
        console.log("\n-----");
        console.log(`Finished agent: ${event.name}\n`);
        console.log(`Agent output was: ${event.data.output}`);
        console.log("\n-----");
      }
    } else if (eventType === "on_llm_stream") {
      const content = event.data?.chunk?.message?.content;
      // Empty content in the context of OpenAI means
      // that the model is asking for a tool to be invoked via function call.
      // So we only print non-empty content
      if (content !== undefined && content !== "") {
        console.log(`| ${content}`);
      }
    } else if (eventType === "on_tool_start") {
      console.log("\n-----");
      console.log(
        `Starting tool: ${event.name} with inputs: ${event.data.input}`,
      );
    } else if (eventType === "on_tool_end") {
      console.log("\n-----");
      console.log(`Finished tool: ${event.name}\n`);
      console.log(`Tool output was: ${event.data.output}`);
      console.log("\n-----");
    }
  }
}

setupAndExecute();
