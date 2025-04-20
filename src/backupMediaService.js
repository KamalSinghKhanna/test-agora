// server/services/Jobs/backupMediaService.js
const { S3FolderCopy } = require('./mediaFileServices');
const dbClient = require('../../helpers/databaseClient');
const Logger = require('@/logger');
const queries = require('./queries');

const logger = new Logger({ filename: __filename });

class BackupMediaService {
  constructor(config = {}) {
    this.s3FolderCopy = new S3FolderCopy(config);
    this.intervalRef = null;
    this.startBackgroundMonitoring();
  }

  startBackgroundMonitoring() {
    this.intervalRef = setInterval(async () => {
      try {
        const tasks = await dbClient.execQuery(queries.getTaskIdOfInProgressTask);
        for (const task of tasks) {
          await this.checkAndUpdateTaskStatus(task.task_id);
        }
      } catch (error) {
        logger.error('Error in background monitoring:', error);
      }
    }, 5000);
  }

  shutdown() {
    if (this.intervalRef) clearInterval(this.intervalRef);
  }

  async checkAndUpdateTaskStatus(taskId) {
    try {
      const mmiStatus = this.s3FolderCopy.getCopyStatus(`${taskId}_copy1`);
      const mediaStatus = this.s3FolderCopy.getCopyStatus(`${taskId}_copy2`);

      logger.info('Copy Progress Status:', {
        taskId,
        mmiCopy: mmiStatus,
        mediaCopy: mediaStatus,
      });

      if (mmiStatus?.status === 'FAILED' || mediaStatus?.status === 'FAILED') {
        await this.updateTaskStatus(taskId, 'failed');
        return;
      }

      if (mmiStatus?.status === 'COMPLETED' && mediaStatus?.status === 'COMPLETED') {
        await this.updateTaskStatus(taskId, 'done');
      }
    } catch (error) {
      logger.error('Error checking task status:', { taskId, error: error.message });
    }
  }

  async updateTaskStatus(taskId, status) {
    try {
      if (!taskId || !status) throw new Error('Missing taskId or status');

      await dbClient.execQuery(queries.updateMediaTaskStatusByJobIdQuery, {
        status,
        taskId,
        initiatedAt: new Date().toISOString(),
      });

      logger.info(`Task ${taskId} updated to ${status}`);
    } catch (error) {
      logger.error('Failed to update task status:', { taskId, error: error.message });
      throw error;
    }
  }

  async startBackupProcess(params) {
    const {
      jobId,
      sourceBucketMmi,
      sourcePrefixMmi,
      targetBucketMmi,
      targetPrefixMmi,
      sourceBucketMedia,
      sourcePrefixMedia,
      targetBucketMedia,
      targetPrefixMedia,
    } = params;

    try {
      const results = await dbClient.execQuery(queries.getTaskByJobIdQuery, { jobId });
      const [task] = results;

      if (!task) throw new Error(`No task found for job ${jobId}`);

      await this.updateTaskStatus(task.task_id, 'in-progress');

      const copyPromises = [
        this.s3FolderCopy.copyFolder({
          sourceBucket: sourceBucketMmi,
          sourcePrefix: sourcePrefixMmi,
          targetBucket: targetBucketMmi,
          targetPrefix: targetPrefixMmi,
          taskId: `${task.task_id}_copy1`,
        }),
        this.s3FolderCopy.copyFolder({
          sourceBucket: sourceBucketMedia,
          sourcePrefix: sourcePrefixMedia,
          targetBucket: targetBucketMedia,
          targetPrefix: targetPrefixMedia,
          taskId: `${task.task_id}_copy2`,
        }),
      ];

      await Promise.all(copyPromises);

      logger.info('Copy operations initiated', { taskId: task.task_id, jobId });
    } catch (error) {
      logger.error('Error in startBackupProcess:', { error: error.message, jobId });
      throw error;
    }
  }
}

module.exports = BackupMediaService;
