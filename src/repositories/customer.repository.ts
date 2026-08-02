import { Customer, CustomerStats, UpsertCustomerInput } from '../types';



export interface CustomerRepository {

  upsertFromMessage(input: UpsertCustomerInput): Promise<Customer>;

  findById(id: string): Promise<Customer | null>;

  findByTelegramUserId(telegramUserId: string): Promise<Customer | null>;

  findAll(): Promise<Customer[]>;

  incrementReminderCount(id: string): Promise<Customer | null>;

  getStats(scheduledCustomerIds?: string[]): Promise<CustomerStats>;

  count(): Promise<number>;

}


