import AsyncStorage from '@react-native-async-storage/async-storage';

const ATTEMPTED_QUESTIONS_KEY = 'pte_flow_attempted_questions';
const TOTAL_SCORE_KEY = 'pte_flow_total_score';
const USER_NAME_KEY = 'pte_flow_user_name';
const ORIGINAL_SSID_KEY = 'pte_flow_original_ssid';

export const scoreService = {
  async isFirstAttempt(questionId: string): Promise<boolean> {
    const attempted = await this.getAttemptedQuestions();
    return !attempted.includes(questionId);
  },

  async markAsAttempted(questionId: string) {
    const attempted = await this.getAttemptedQuestions();
    if (!attempted.includes(questionId)) {
      attempted.push(questionId);
      await AsyncStorage.setItem(ATTEMPTED_QUESTIONS_KEY, JSON.stringify(attempted));
      return true;
    }
    return false;
  },

  async getAttemptedQuestions(): Promise<string[]> {
    const data = await AsyncStorage.getItem(ATTEMPTED_QUESTIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async addPoint() {
    const currentScore = await this.getScore();
    const newScore = currentScore + 1;
    await AsyncStorage.setItem(TOTAL_SCORE_KEY, newScore.toString());
    return newScore;
  },

  async getScore(): Promise<number> {
    const data = await AsyncStorage.getItem(TOTAL_SCORE_KEY);
    return data ? parseInt(data, 10) : 0;
  },

  async setUserName(name: string) {
    await AsyncStorage.setItem(USER_NAME_KEY, name);
  },

  async getUserName(): Promise<string | null> {
    return await AsyncStorage.getItem(USER_NAME_KEY);
  },

  async setOriginalSSID(ssid: string) {
    await AsyncStorage.setItem(ORIGINAL_SSID_KEY, ssid);
  },

  async getOriginalSSID(): Promise<string | null> {
    return await AsyncStorage.getItem(ORIGINAL_SSID_KEY);
  }
};
