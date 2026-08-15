package com.hanoiprep.hses.grading;

import com.hanoiprep.hses.config.RabbitMQConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class AIGradingProducer {

    private static final Logger log = LoggerFactory.getLogger(AIGradingProducer.class);

    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private AIGradingService aiGradingService;

    // Thread pool dự phòng (Fallback) khi RabbitMQ chưa bật
    private final ExecutorService fallbackExecutor = Executors.newFixedThreadPool(3);

    public void sendGradingTask(Long submissionId) {
        boolean sentToRabbitMQ = false;

        if (rabbitTemplate != null) {
            try {
                log.info("Pushing submissionId {} to RabbitMQ queue [{}]...", submissionId, RabbitMQConfig.QUEUE);
                rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, RabbitMQConfig.ROUTING_KEY, submissionId);
                sentToRabbitMQ = true;
                log.info("Successfully queued submissionId {} in RabbitMQ", submissionId);
            } catch (Exception e) {
                log.warn("RabbitMQ unavailable ({}), falling back to internal Async Thread Pool for submissionId {}", e.getMessage(), submissionId);
            }
        }

        if (!sentToRabbitMQ) {
            log.info("Executing async grading via internal ThreadPool for submissionId {}...", submissionId);
            fallbackExecutor.submit(() -> {
                try {
                    // Throttling 500ms giữa các request để chống ngẽn Gemini API
                    Thread.sleep(500);
                    aiGradingService.gradeSubmission(submissionId);
                    log.info("Fallback async grading completed for submissionId {}", submissionId);
                } catch (Exception ex) {
                    log.error("Error in fallback async grading for submissionId {}: {}", submissionId, ex.getMessage(), ex);
                }
            });
        }
    }
}
