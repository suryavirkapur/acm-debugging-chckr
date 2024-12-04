import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "octokit";
import "dotenv/config";

import { generateObject } from 'ai';
import { z } from 'zod';

import { anthropic } from '@ai-sdk/anthropic';
import gitCloneRepo from "./gitCloneRepo";


const scoring = `
3 Easy (5 points each) [Q1-3]
4 Medium (10 points each) [Q4-7]
2 Hard (15 points each) [Q8-9]
1 Impossible (25 points) [Q10]
`;

async function processRepo(repoName: string) {
    const questions = [];
    const answers = [];
    const targetDir = repoName;
    for (let i = 1; i <= 7; i++) {
        try {
            const questionContent = readFileSync(
                join(process.cwd(), targetDir, `Q${i}/Q${i}.md`),
                "utf-8"
            );

            let solutionContent;
            const solutionPath = join(process.cwd(), targetDir, `Q${i}/Solution.`);

            if (i === 4) {
                solutionContent = readFileSync(solutionPath + "js", "utf-8");
            } else if (i === 5 || i === 7) {
                solutionContent = readFileSync(solutionPath + "html", "utf-8");
            } else {
                solutionContent = readFileSync(solutionPath + "py", "utf-8");
            }

            questions.push(
                `# Question ${i}\n\n${questionContent.trim()}\n\n${"=".repeat(80)}\n\n`
            );
            answers.push(
                `# Solution ${i}\n\n\`\`\`${i === 4 ? "javascript" : i === 5 || i === 7 ? "html" : "python"
                }\n${solutionContent.trim()}\n\`\`\`\n\n${"=".repeat(80)}\n\n`
            );
        } catch (error) {
            console.error(`Error processing Q${i}: ${error}`);
        }
    }

    const res = await getScores(questions.join("\n"), answers.join("\n"))

    mkdirSync("results", { recursive: true });

    writeFileSync(
        join("results", `${repoName}.txt`),
        JSON.stringify(res, null, 2)
    );
}


async function getScores(questions: string, solutions: string) {
    const { object } = await generateObject({
        model: anthropic('claude-3-5-haiku-20241022'),
        schema: z.object({
            data: z.array(z.object({
                questionNumber: z.number(),
                score: z.number().min(0).max(25)
            })),
        }),
        prompt: `There are bugs in each question. Be very harsh while grading. Score the following Questions: \n ${questions}. The Questions are numbered from 1 to 10. The JSON Object should be in the format: {"data": [{"questionNumber": number, "score": number}]}. Return the JSON Object. Scoring is as follows: ${scoring}. Here are the answers: \n ${solutions}`,
    });

    return object;
}

async function main() {
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
    });

    const repos = await octokit.request("GET /orgs/acmcomp/repos", {
        org: "ORG",
        headers: {
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });

    for (const repo of repos.data) {
        if (repo.name.includes("acm-debugging-comp")) {
            console.log(`Processing ${repo.name}`);
            await gitCloneRepo(repo.name);
            await processRepo(repo.name);
        }
    }
}

main().catch(console.error);

