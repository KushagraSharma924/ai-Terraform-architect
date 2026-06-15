import { Inject } from '@nestjs/common';

export const DRIZZLE_TOKEN = 'DRIZZLE_DB';
export const InjectDrizzle = () => Inject(DRIZZLE_TOKEN);
