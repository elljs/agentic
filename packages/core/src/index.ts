
import * as ai from 'ai';
import { Agent, Classifier, type ClassifierResult, type ConversationMessage, MultiAgentOrchestrator } from "multi-agent-orchestrator";
import vm from 'node:vm';
import { createOllama } from 'ollama-ai-provider';
import Spinner from 'yocto-spinner';

const ollama = createOllama({
	baseURL: "http://127.0.0.1:11434/api",
});
const model = ollama('llama3.2');

const createAgent = (code: string) => {
	const ctx = vm.createContext({
		model,
		ai,
	});

	vm.runInContext(`
		const processRequest = ${code}
	`, ctx);

	return class extends Agent {
		async processRequest(...params: any[]) {
			return vm.runInContext('processRequest', ctx)(...params);
		}
	}
}

const TechAgent = createAgent(`
	async (prompt) => {
		const { textStream } = await ai.streamText({
			model,
			prompt
		});

		return textStream;
	};
`);

export class KeywordClassifier extends Classifier {
	private keywordMap: { [keyword: string]: string };

	constructor(keywordMap: { [keyword: string]: string }) {
		super();
		this.keywordMap = keywordMap;
	}

	async processRequest(
		inputText: string,
		chatHistory: ConversationMessage[]
	): Promise<ClassifierResult> {
		const lowercaseInput = inputText.toLowerCase();

		for (const [keyword, agentId] of Object.entries(this.keywordMap)) {
			if (lowercaseInput.includes(keyword)) {
				const selectedAgent = this.getAgentById(agentId);
				return {
					selectedAgent,
					confidence: 0.8
				};
			}
		}

		const defaultAgent = Object.values(this.agents)[0] ?? null;
		return {
			selectedAgent: defaultAgent,
			confidence: 0.5
		};
	}
}

const classifier = new KeywordClassifier({
	'人工智能': 'tech-agent',
	'量化交易': 'finance-agent',
});
const orchestrator = new MultiAgentOrchestrator({ classifier });

orchestrator.addAgent(new TechAgent({
	name: "tech-agent",
	description: "专注于包括软件开发、硬件、人工智能、网络安全、区块链、云计算、新兴技术创新以及与技术产品和服务相关的定价/成本的技术领域。",
}));

const userId = "user-1";
const sessionId = "session-1";
const query = "人工智能最新的趋势是什么？";

const response = await orchestrator.routeRequest(query, userId, sessionId);

const logger = Spinner({ 'text': '智能分析中...\n' });
logger.start();

for await (const chunk of response.output) {
	if (logger.isSpinning) {
		logger.success();
	}
	if (typeof chunk === "string") {
		process.stdout.write(chunk);
	} else {
		console.error("Received unexpected chunk type:", typeof chunk);
	}
}