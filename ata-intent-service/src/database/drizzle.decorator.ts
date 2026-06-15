import { Inject } from '@nestjs/common';

export const DRIZZLE_TOKEN = 'DRIZZLE_TOKEN';
export const InjectDrizzle = () => Inject(DRIZZLE_TOKEN);
