import { invokeLLM, type InvokeParams, type InvokeResult } from "../_core/llm";
import { getLlmCredentialsForAgent } from "./credentials";

function customPayload(params: InvokeParams) {
  const { toolChoice, tool_choice, maxTokens, max_tokens, outputSchema, output_schema, responseFormat, response_format, ...rest } = params;
  return {
    ...rest,
    ...(toolChoice || tool_choice ? { tool_choice: toolChoice || tool_choice } : {}),
    ...(typeof (max_tokens ?? maxTokens) === "number" ? { max_tokens: max_tokens ?? maxTokens } : {}),
    ...(outputSchema || output_schema ? { response_format: { type: "json_schema", json_schema: outputSchema || output_schema } } : responseFormat || response_format ? { response_format: responseFormat || response_format } : {}),
  };
}

export async function hasConfiguredLucyLlm() {
  const credentials = await getLlmCredentialsForAgent();
  return Boolean(credentials || process.env.BUILT_IN_FORGE_API_KEY);
}

export async function invokeLucyLlm(params: InvokeParams): Promise<InvokeResult> {
  const credentials = await getLlmCredentialsForAgent();
  if (!credentials) return invokeLLM(params);

  const response = await fetch(`${credentials.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${credentials.apiKey}` },
    body: JSON.stringify({ ...customPayload(params), model: credentials.model }),
  });

  if (!response.ok) {
    const errorText = (await response.text()).slice(0, 300);
    throw new Error(`BYO LLM request failed: ${response.status} ${errorText}`);
  }
  return (await response.json()) as InvokeResult;
}
