<template>
  <div>
    <RoomCard :room='room' :is-operable='false' />
    <el-alert
      title='Attention'
      :description='warningInfo'
      class='warning-info'
      type='warning'
      show-icon
      :closable='false'>
    </el-alert>
    <el-form ref='form' :model='form' class='reservation-form' label-width='100px'>
      <el-form-item label='Reserved by'>
        {{ loggedInUser.username }}
      </el-form-item>
      <el-form-item label='Date'>
        <el-col :span='5'>
          <div class='w-48'>
            <el-date-picker v-model='form.expectedDate' type='date' placeholder='Choose Date' value-format='yyyy-MM-dd'
                            class='time-select'></el-date-picker>
          </div>
        </el-col>
      </el-form-item>
      <el-form-item label='Time'>
        <div class='w-80'>
          <el-col :span='11'>
            <el-time-select
              v-model='form.expectedStartTime'
              :editable='false'
              :picker-options='timeSelectOptions'
              class='time-select'
              placeholder='Start Time'>
            </el-time-select>
          </el-col>
          <el-col class='line' :span='2'>-</el-col>
          <el-col :span='11'>
            <el-time-select
              v-model='form.expectedEndTime'
              :editable='false'
              :picker-options='timeSelectOptions'
              class='time-select'
              placeholder='End Time'>
            </el-time-select>
          </el-col>
        </div>
      </el-form-item>
      <el-form-item label='Members'>
        <el-tag
          v-for='member in form.memberUsernameList'
          :key='member'
          closable
          class='add-member-input-tag'
          :disable-transitions='false'
          @close='handleMemberTagClose(member)'>
          {{ member }}
        </el-tag>
        <el-input
          v-if='form.addMemberInputVisible'
          ref='saveMemberTagInput'
          v-model='form.addMemberInputValue'
          class='add-member-input-new-tag'
          size='small'
          @keyup.enter.native='handleAddMemberInputConfirm'
          @blur='handleAddMemberInputConfirm'
        >
        </el-input>
        <el-button v-else class='button-new-tag' size='small' @click='showAddMemberInput'>+ Add Member</el-button>
      </el-form-item>
      <el-form-item>
        <el-button type='primary' @click='addReservation'>Submit</el-button>
      </el-form-item>
    </el-form>

  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  middleware: ['auth'],
  async asyncData({ app, route }) {
    const room = await app.$api.$post('/getRoom', { roomId: route.params.id });
    console.log(room);
    return {
      room: room.content
    };
  },
  data() {
    return {
      id: this.$route.params.id,
      room: Object,
      memberIdList: [],
      date: '',
      warningInfo: 'As main user of this room, you will be blacklisted if the number of sign-in members doesn\'t reach the minimum required number of members.',
      timeSelectOptions: {
        start: '08:00',
        step: '00:30',
        end: '22:30'
      },
      form: {
        expectedDate: '',
        expectedStartTime: '',
        expectedEndTime: '',
        memberUsernameList: [],
        addMemberInputVisible: false,
        addMemberInputValue: ''
      }
    };
  },
  computed: {
    startDateTime() {
      return this.form.expectedDate + ' ' + this.form.expectedStartTime;

    },
    endDateTime() {
      return this.form.expectedDate + ' ' + this.form.expectedEndTime;
    },
    ...mapGetters(['loggedInUser'])
  },
  methods: {
    async addReservation() {
      if (this.form.expectedDate === null) {
        this.$message.error('Please choose a date.');
        return;
      }
      const expectedDate = new Date(Date.parse(this.form.expectedDate));
      console.log(expectedDate);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      if (expectedDate < todayDate) {
        this.$message.error('Please choose a date after today.');
        return;
      }
      if (this.form.expectedStartTime === null) {
        this.$message.error('Please choose a start time.');
        return;
      }
      if (this.form.expectedEndTime === null) {
        this.$message.error('Please choose a end time.');
        return;
      }
      if (this.form.expectedStartTime >= this.form.expectedEndTime) {
        this.$message.error('Start time should be earlier than end time.');
        return;
      }
      if (this.form.expectedStartTime === this.form.expectedEndTime) {
        this.$message.error('Start time and end time should not be the same.');
        return;
      }
      if (this.form.memberUsernameList.length === 0) {
        this.$message.error('Please add at least one member.');
        return;
      }
      if (this.memberIdList.length + 1 < this.room.capacityMin) {
        this.$message.error('The number of members is less than the minimum required number of members');
        return;
      }
      const resp = await this.$api.$post('/addReservation', {
        userId: this.$store.state.user.id,
        roomId: this.room.roomId,
        memberList: this.memberIdList,
        startTime: this.startDateTime,
        endTime: this.endDateTime
      });
      console.log(resp);
      if (resp.success) {
        this.$message.success(resp.message);
        await this.$router.push('/my/reservation');
      } else {
        this.$message.error(resp.message);
      }
    },

    async handleAddMemberInputConfirm() {
      const inputValue = this.form.addMemberInputValue;
      if (inputValue) {
        const resp = await this.$api.$post('/getUserByUsername', { username: this.form.addMemberInputValue });
        if (resp.success) {
          const username = resp.content.username;
          const fullName = resp.content.firstName + ' ' + resp.content.lastName;
          const userId = resp.content.userId;
          if (userId === await this.$store.state.user.id) {
            this.$message.error('You cannot add yourself as a member');
            this.form.addMemberInputVisible = false;
            this.form.addMemberInputValue = '';
            return;
          }
          if (this.memberIdList.includes(userId)) {
            this.$message.error('This member has already been added');
            this.form.addMemberInputVisible = false;
            this.form.addMemberInputValue = '';
            return;
          }
          if (this.memberIdList.length + 1 > this.room.capacityMax) {
            this.$message.error('The number of members has reached the maximum number of members');
            this.form.addMemberInputVisible = false;
            this.form.addMemberInputValue = '';
            return;
          }
          this.form.memberUsernameList.push(username + ' (' + fullName + ')');
          this.memberIdList.push(userId);
        } else {
          this.$message.error(resp.message);
        }
      }
      this.form.addMemberInputVisible = false;
      this.form.addMemberInputValue = '';


    },
    handleMemberTagClose(tag) {
      this.memberIdList.splice(this.memberIdList.indexOf(tag), 1);
      this.form.memberUsernameList.splice(this.form.memberUsernameList.indexOf(tag), 1);
    },
    showAddMemberInput() {
      this.form.addMemberInputVisible = true;
      this.$nextTick(_ => {
        this.$refs.saveMemberTagInput.$refs.input.focus();
      });
    }
  }
};
</script>

<style scoped lang='scss'>
.add-member-input-new-tag {
  width: 150px;
}

.add-member-input-tag {
  @apply mr-1.5;
}

.reservation-form {
  @apply mt-3;
}

.time-select {
  /*@apply w-36;*/
  @apply w-full;

}

.line {
  /*@apply w-2;*/
  text-align: center;
}

.warning-info {
  @apply mt-5;

}
</style>
