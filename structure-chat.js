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
const {
  AgentExecutor,
  createStructuredChatAgent,
} = require("langchain/agents");
const { pull } = require("langchain/hub");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { ChatCohere } = require("@langchain/cohere");

async function start() {
  const get_weather = new DynamicTool({
    name: "get_weather",
    description: "Returns the weather of a place.",
    func: async (input) => {
      try {
        const geocodingUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${input}&limit=1&appid=be7cbd382c66e8090c59bd782093bfdf`;
        const geocode = await get(geocodingUrl);

        const { lat, lon } = geocode.data[0];
        console.log(lat, lon);

        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=be7cbd382c66e8090c59bd782093bfdf`;
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
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        // second: 'numeric',
        timeZone: "America/New_York",
      };
      const date_time = new Date().toLocaleString("en-US", options);
      console.log(date_time);
      return date_time;
    },
  });

  const tools = [
    new TavilySearchResults({
      maxResults: 1,
      apiKey: "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",
    }),
    new DuckDuckGoSearch({ maxResults: 1 }),
    new WikipediaQueryRun({ topKResults: 3, maxDocContentLength: 4000 }),
    get_weather,
    get_date_and_time,
  ];

  const prompt = await pull("hwchase17/structured-chat-agent");

  const llm = new ChatCohere({
    model: "command-r-plus",
    temperature: 0.7,
    apiKey: "JiRdLpBtFPp64OPYgDjpwRufRc293F1ZJEk15LWl",
  });

  const agent = await createStructuredChatAgent({
    llm,
    tools,
    prompt,
  });

  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  }).withConfig({ runName: "Agent" });

  // const result = await agentExecutor.invoke({
  //   input: "what is LangChain?",
  // });

  const eventStream = await agentExecutor.streamEvents(
    {
      input: "do some research, and make me a table comparing the bra size of Emma Watson, Scarlett Johansson, and Margot Robbie. remember that you may use tools as often and as many times as you need.",
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

start();
