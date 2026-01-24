import { removeAuthToken } from '@libs/util/server/cookies.server';
import { data } from 'react-router';

export const action = async () => {
  const headers = new Headers();
  removeAuthToken(headers);
  return data({ success: true }, { headers });
};
