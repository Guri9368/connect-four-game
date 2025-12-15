const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'connect-four-game',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 300,
    retries: 3
  }
});

let producer;

async function connectProducer() {
  // Skip Kafka in production
  if (process.env.NODE_ENV === 'production') {
    console.log('ℹ️  Kafka analytics disabled in production (optional feature)');
    return;
  }

  try {
    producer = kafka.producer();
    await producer.connect();
    console.log('✓ Kafka producer connected');
  } catch (error) {
    console.log('⚠ Kafka not available, continuing without analytics');
  }
}

async function publishEvent(topic, event) {
  if (!producer || process.env.NODE_ENV === 'production') {
    return;
  }

  try {
    await producer.send({
      topic: topic || 'game-events',
      messages: [{
        key: event.gameId || event.username || 'event',
        value: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString()
        })
      }]
    });
  } catch (error) {
    console.log('Event publish skipped:', error.message);
  }
}

async function disconnectProducer() {
  if (producer) {
    try {
      await producer.disconnect();
      console.log('Kafka producer disconnected');
    } catch (error) {
      // Ignore disconnect errors
    }
  }
}

module.exports = {
  publishEvent,
  connectProducer,
  disconnectProducer
};
