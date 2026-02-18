import {StyleSheet} from 'react-native';

export const colors = {
  primary: '#2563EB',
  background: '#F4F8FF',
  white: '#FFFFFF',
  border: '#E5E7EB',
  title: '#1E3A8A',
  error: '#DC2626',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: colors.title,
  },
  input: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: 10,
  },
});
