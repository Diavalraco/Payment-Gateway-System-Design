import { GatewayClientService, gatewayClient } from '../services/gatewayClient.service';

/** Thin adapter facade for swapping mock/simulated implementations. */
export class MockGatewayAdapter {
  constructor(private readonly client: GatewayClientService = gatewayClient) {}

  charge(paymentId: string): ReturnType<GatewayClientService['charge']> {
    return this.client.charge(paymentId);
  }
}

export const mockGatewayAdapter = new MockGatewayAdapter();
