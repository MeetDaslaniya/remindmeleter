import { ACTIVE_REMINDER_STATUSES, Customer, CustomerStats, UpsertCustomerInput } from '../types';

import { CustomerRepository } from '../repositories/customer.repository';

import { ReminderRepository } from '../repositories/reminder.repository';

import { config } from '../config';



export class CustomerService {

  constructor(

    private readonly customerRepository: CustomerRepository,

    private readonly reminderRepository: ReminderRepository

  ) {}



  async touchFromMessage(input: UpsertCustomerInput): Promise<Customer> {

    return this.customerRepository.upsertFromMessage({

      ...input,

      timezone: input.timezone ?? config.DEFAULT_TIMEZONE,

      channel: input.channel ?? 'telegram',

    });

  }



  async getAll(): Promise<Customer[]> {

    return this.customerRepository.findAll();

  }



  async getById(id: string): Promise<Customer | null> {

    return this.customerRepository.findById(id);

  }



  async getStats(): Promise<CustomerStats> {

    const scheduled = await this.reminderRepository.findByStatuses(ACTIVE_REMINDER_STATUSES);

    const customerIds = scheduled

      .map((r) => r.customerId)

      .filter((id): id is string => Boolean(id));

    return this.customerRepository.getStats(customerIds);

  }



  async incrementReminderCount(customerId: string): Promise<void> {

    await this.customerRepository.incrementReminderCount(customerId);

  }

}


