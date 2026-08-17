package com.hanoiprep.hses.grading;

import com.hanoiprep.hses.config.RabbitMQConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class AIGradingConsumer {

    private static final Logger log = LoggerFactory.getLogger(AIGradingConsumer.class);

    @Autowired
    private AIGradingService aiGradingService;

    @RabbitListener(queues = RabbitMQConfig.QUEUE)
    public void processGradingTask(Long submissionId) {
        log.info("Processing AI grading...");
        try {
            // Throttling 500ms giữa các request để phòng tránh Rate Limit (429) của Gemini
            // API
            Thread.sleep(500);
            aiGradingService.gradeSubmission(submissionId);
            log.info("Successfully processed");
        } catch (Exception e) {
            log.error("Failed to process: " + e.getMessage());
        }
    }
}
