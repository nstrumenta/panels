// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { StoryObj, StoryFn } from '@storybook/react';
import { screen, userEvent } from '@storybook/testing-library';
import { useEffect } from 'react';

import MockMessagePipelineProvider from '@base/components/MessagePipeline/MockMessagePipelineProvider';
import { useEvents } from '@base/context/EventsContext';
import EventsProvider from '@base/providers/EventsProvider';
import { makeMockEvents } from '@base/test/mocks/makeMockEvents';

import { EventsList } from './EventsList';

function Wrapper(Child: StoryFn): JSX.Element {
  return (
    <MockMessagePipelineProvider>
      <EventsProvider>
        <Child />
      </EventsProvider>
    </MockMessagePipelineProvider>
  );
}

export default {
  title: 'components/EventsList',
  component: EventsList,
  decorators: [Wrapper],
};

export const Default: StoryObj = {
  render: function Story() {
    const setEvents = useEvents((store) => store.setEvents);
    useEffect(() => {
      setEvents({ loading: false, value: makeMockEvents(20) });
    }, [setEvents]);

    return <EventsList />;
  },
};

export const Selected: StoryObj = {
  render: function Story() {
    const setEvents = useEvents((store) => store.setEvents);
    const selectEvent = useEvents((store) => store.selectEvent);

    useEffect(() => {
      const events = makeMockEvents(20);

      setEvents({ loading: false, value: events });
    }, [selectEvent, setEvents]);

    return <EventsList />;
  },

  play: async () => {
    const events = await screen.findAllByTestId('sidebar-event');
    userEvent.click(events[1]!);
  },

  parameters: {
    colorScheme: 'light',
  },
};

export const WithError: StoryObj = {
  render: function Story() {
    const setEvents = useEvents((store) => store.setEvents);
    useEffect(() => {
      setEvents({ loading: false, error: new Error('Error loading events') });
    }, [setEvents]);

    return <EventsList />;
  },
};

export const Loading: StoryObj = {
  render: function Story() {
    const setEvents = useEvents((store) => store.setEvents);
    useEffect(() => {
      setEvents({ loading: true });
    }, [setEvents]);

    return <EventsList />;
  },
};
