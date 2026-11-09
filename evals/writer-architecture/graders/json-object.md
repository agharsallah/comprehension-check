---
type: regex
weight: 3
pattern: '^\s*\{(?=[\s\S]*"questions"\s*:\s*\[)(?=[\s\S]*"answer_key"\s*:\s*\[)[\s\S]*\}\s*$'
---
The whole reply is one JSON object holding both `answer_key` and `questions`: no code fence, no prose around it.
