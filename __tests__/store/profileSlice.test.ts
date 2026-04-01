import profileReducer, {
  setCandidateId,
  setResumeId,
  setResumeUploaded,
  resetProfile,
  ProfileState,
} from '../../src/store/profileSlice';

describe('profileSlice reducers', () => {
  const initialState: ProfileState = {
    candidateId: '',
    resumeId: '',
    resumeUploaded: false,
  };

  it('should handle initial state', () => {
    expect(profileReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setCandidateId', () => {
    const actual = profileReducer(initialState, setCandidateId('user-123'));
    expect(actual.candidateId).toEqual('user-123');
  });

  it('should handle setResumeId', () => {
    const actual = profileReducer(initialState, setResumeId('resume-456'));
    expect(actual.resumeId).toEqual('resume-456');
  });

  it('should handle setResumeUploaded', () => {
    const actual = profileReducer(initialState, setResumeUploaded(true));
    expect(actual.resumeUploaded).toEqual(true);
  });

  it('should handle resetProfile', () => {
    const modifiedState: ProfileState = {
      candidateId: 'user-123',
      resumeId: 'resume-456',
      resumeUploaded: true,
    };
    const actual = profileReducer(modifiedState, resetProfile());
    expect(actual).toEqual(initialState);
  });
});
