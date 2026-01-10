
import { render, fireEvent, act } from '@testing-library/react-native';
import { TimeSlider } from '../time-slider';
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// モック
vi.mock('@expo/vector-icons/MaterialIcons', () => ({
  default: (props: any) => <>{JSON.stringify(props)}</>,
}));
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Medium: 'medium', Light: 'light' },
}));
vi.mock('@react-native-community/slider', () => ({
  default: 'Slider',
}));

// フックのモック
vi.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('TimeSlider', () => {
  const mockOnTimeChange = vi.fn();
  const currentTime = new Date('2023-01-01T12:00:00');
  const sunrise = new Date('2023-01-01T06:00:00');
  const sunset = new Date('2023-01-01T18:00:00');

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnTimeChange.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders correctly', () => {
    const { getByText } = render(
      <TimeSlider
        currentTime={currentTime}
        onTimeChange={mockOnTimeChange}
        sunrise={sunrise}
        sunset={sunset}
      />
    );
    expect(getByText('12:00')).toBeTruthy();
  });

  it('starts animation when play button is pressed', async () => {
    const { getByTestId } = render(
      <TimeSlider
        currentTime={currentTime}
        onTimeChange={mockOnTimeChange}
        sunrise={sunrise}
        sunset={sunset}
      />
    );

    const playButton = getByTestId('play-button');
    fireEvent.press(playButton);

    // Initial state is playing.
    // Timer should run.

    // Advance 50ms (one tick)
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Check if onTimeChange was called
    expect(mockOnTimeChange).toHaveBeenCalled();
    // It should have been called with current time + 2 minutes
    const expectedTime = new Date(currentTime);
    expectedTime.setMinutes(currentTime.getMinutes() + 2);
    expect(mockOnTimeChange).toHaveBeenCalledWith(expectedTime);

    // Advance another 50ms
    act(() => {
      vi.advanceTimersByTime(50);
    });
    // Since mockOnTimeChange updates the parent state, and the parent passes back the new time,
    // BUT in this test, we are not updating the prop `currentTime`.
    // The component depends on `currentTime` prop for the next calculation:
    // `const nextTime = new Date(currentTime);`
    // Since `currentTime` prop doesn't change in this test render (unless we wrap it),
    // the next call will ALSO be currentTime + 2 minutes.
    // This confirms the logic is using the prop.

    expect(mockOnTimeChange).toHaveBeenCalledTimes(2);
  });

  it('stops at sunset', () => {
    // Start near sunset
    const nearSunset = new Date(sunset);
    nearSunset.setMinutes(sunset.getMinutes() - 1); // 1 minute before sunset

    const { getByTestId } = render(
      <TimeSlider
        currentTime={nearSunset}
        onTimeChange={mockOnTimeChange}
        sunrise={sunrise}
        sunset={sunset}
      />
    );

    const playButton = getByTestId('play-button');
    fireEvent.press(playButton);

    // Advance 50ms -> Adds 2 minutes -> 1 minute AFTER sunset
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Should call onTimeChange with sunset time (clamped)
    // And should stop playing (which we can't easily check internal state, but we can check if it stops calling callback)

    // Expect callback to be called with exact sunset time
    expect(mockOnTimeChange).toHaveBeenLastCalledWith(sunset);

    mockOnTimeChange.mockClear();

    // Advance more time
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should NOT be called again because it stopped
    expect(mockOnTimeChange).not.toHaveBeenCalled();
  });
});
