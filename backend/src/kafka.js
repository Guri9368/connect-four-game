const { Kafka, Partitioners } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'connect-four-game',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    retries: 5,
    initialRetryTime: 300
  }
});

const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
  idempotent: true,
  maxInFlightRequests: 5
});

let isConnected = false;

async function connectProducer() {
  if (!isConnected) {
    try {
      await producer.connect();
      isConnected = true;
      console.log('✓ Kafka producer connected');
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error);
    }
  }
}

async function publishEvent(eventType, payload) {
  if (!isConnected) {
    console.warn('Kafka producer not connected, skipping event:', eventType);
    return;
  }

  const event = {
    eventType,
    timestamp: Date.now(),
    ...payload
  };

  try {
    await producer.send({
      topic: process.env.KAFKA_TOPIC || 'game-events',
      messages: [
        {
          key: payload.gameId || 'system',
          value: JSON.stringify(event),
          headers: {
            eventType
          }
        }
      ]
    });
  } catch (error) {
    console.error('Error publishing Kafka event:', error);
  }
}

async function disconnectProducer() {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('✓ Kafka producer disconnected');
  }
}

module.exports = {
  connectProducer,
  publishEvent,
  disconnectProducer
};
