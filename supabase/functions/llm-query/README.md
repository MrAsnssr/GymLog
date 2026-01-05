# LLM Query Edge Function

This Edge Function handles natural language queries and executes database operations using OpenAI's function calling.

## Setup

Set the following environment variable:
- `OPENAI_API_KEY`: Your OpenAI API key

## Usage

Send a POST request with:
- Authorization header with Bearer token
- Body: `{ "query": "your natural language query" }`

## Examples

- "What did I bench press last week?"
- "Log 3 sets of squats at 225lbs for 8 reps"
- "Show me my calories for today"
- "How many workouts did I do this week?"


