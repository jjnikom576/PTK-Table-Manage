import { DatabaseManagerBase } from './database-manager-base';
import { DatabaseManagerInitializationMixin } from './database-manager-initialization';
import { DatabaseManagerPeriodsMixin } from './database-manager-periods';
import { DatabaseManagerTeachersMixin } from './database-manager-teachers';
import { DatabaseManagerClassesMixin } from './database-manager-classes';
import { DatabaseManagerRoomsMixin } from './database-manager-rooms';
import { DatabaseManagerSubjectsMixin } from './database-manager-subjects';
import { DatabaseManagerSchedulesMixin } from './database-manager-schedules';

const MixedDatabaseManager = DatabaseManagerSchedulesMixin(
  DatabaseManagerSubjectsMixin(
    DatabaseManagerRoomsMixin(
      DatabaseManagerClassesMixin(
        DatabaseManagerTeachersMixin(
          DatabaseManagerPeriodsMixin(
            DatabaseManagerInitializationMixin(DatabaseManagerBase)
          )
        )
      )
    )
  )
);

export class DatabaseManager extends MixedDatabaseManager {}
