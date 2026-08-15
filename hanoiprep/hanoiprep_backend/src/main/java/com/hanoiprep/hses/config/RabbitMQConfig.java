package com.hanoiprep.hses.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String QUEUE = "ai.grading.queue";
    public static final String EXCHANGE = "ai.grading.exchange";
    public static final String ROUTING_KEY = "ai.grading.routingKey";

    @Bean
    public Queue aiGradingQueue() {
        return new Queue(QUEUE, true);
    }

    @Bean
    public DirectExchange aiGradingExchange() {
        return new DirectExchange(EXCHANGE);
    }

    @Bean
    public Binding aiGradingBinding(Queue aiGradingQueue, DirectExchange aiGradingExchange) {
        return BindingBuilder.bind(aiGradingQueue).to(aiGradingExchange).with(ROUTING_KEY);
    }
}
