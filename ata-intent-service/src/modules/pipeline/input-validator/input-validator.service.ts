import { Injectable, BadRequestException } from '@nestjs/common';

const INJECTION_PATTERNS = [
  /ignore\s+(?:the\s+)?previous\s+instructions/i,
  /ignore\s+(?:the\s+)?rules/i,
  /forget\s+(?:the\s+)?instructions/i,
  /forget\s+everything/i,
  /you\s+are\s+now/i,
  /system:/i,
  /assistant:/i,
  /ignore\s+above/i,
];

const PROFANITY_WORDS = [
  'abuse',
  'hack',
  'exploit',
];

@Injectable()
export class InputValidatorService {
  validate(prompt: string): void {
    if (!prompt) {
      throw new BadRequestException({ error: 'VALIDATION_ERROR', message: 'Prompt is required' });
    }

    const trimmed = prompt.trim();
    if (trimmed.length < 10 || trimmed.length > 4000) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Prompt must be between 10 and 4000 characters',
      });
    }

    // Heuristic prompt injection check
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new BadRequestException({
          error: 'PROMPT_REJECTED',
          message: 'Potential prompt injection attempt detected',
        });
      }
    }

    // Profanity/abuse filter
    const lowercase = trimmed.toLowerCase();
    for (const word of PROFANITY_WORDS) {
      if (lowercase.includes(word)) {
        throw new BadRequestException({
          error: 'PROMPT_REJECTED',
          message: 'Prompt contains inappropriate language or prohibited terms',
        });
      }
    }

    // Language check: English-only heuristic (ensure mostly ASCII/printable Latin chars)
    const asciiCount = (trimmed.match(/[\x20-\x7E]/g) || []).length;
    if (asciiCount / trimmed.length < 0.85) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Language not supported. Only English prompts are allowed for v1',
      });
    }
  }
}
