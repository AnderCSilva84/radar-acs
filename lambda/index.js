'use strict';

const Alexa = require('ask-sdk-core');
const { createBriefingClient } = require('./briefing-client');
const { dailyPlayback, getGreetingOptions } = require('./daily-greeting');
const { addEditionVisual, logEditionVisualResponse } = require('./edition-visual');

const getLatest = createBriefingClient();
const UNAVAILABLE = 'Não consegui acessar o Radar ACS neste momento. Tente novamente em alguns minutos.';

function completeTask(input, code, speech) {
    return input.responseBuilder
        .speak(speech)
        .addDirective({
            type: 'Tasks.CompleteTask',
            status: { code, message: code === '200' ? 'Briefing reproduzido.' : 'Briefing indisponível.' },
            result: code === '200' ? { endTime: new Date().toISOString() } : {}
        })
        .withShouldEndSession(true)
        .getResponse();
}

const BriefingTaskHandler = {
    canHandle(input) {
        const request = input.requestEnvelope.request;
        return request.type === 'LaunchRequest' && Boolean(request.task);
    },

    async handle(input) {
        const envelope = input.requestEnvelope;
        const task = envelope.request.task;
        const skillId = envelope.context?.System?.application?.applicationId || envelope.session?.application?.applicationId;
        if (envelope.request.locale !== 'pt-BR' || task.name !== skillId + '.OuvirBriefingHoje'
            || task.version !== '1' || (task.input && (typeof task.input !== 'object'
                || Array.isArray(task.input) || Object.keys(task.input).length))) {
            return completeTask(input, '400', 'Esta tarefa não está disponível.');
        }
        try {
            const { briefing, prefix } = await getLatest();
            if (!briefing) return completeTask(input, '500', 'Seu briefing de hoje ainda não foi publicado. Tente novamente mais tarde.');
            return completeTask(input, '200', dailyPlayback(briefing, prefix, new Date(), await getGreetingOptions(input)).ssml);
        } catch (error) {
            return completeTask(input, '500', UNAVAILABLE);
        }
    }
};

const LaunchRequestHandler = {
    canHandle(input) {
        const request = input.requestEnvelope.request;

        return request.type === 'LaunchRequest'
            || (
                request.type === 'IntentRequest'
                && ['BriefingIntent', 'AMAZON.NavigateHomeIntent'].includes(request.intent.name)
            );
    },

    async handle(input) {
        try {
            const { briefing, prefix } = await getLatest();
            const speech = briefing
                ? dailyPlayback(briefing, prefix, new Date(), await getGreetingOptions(input)).ssml
                : 'Seu briefing de hoje ainda não foi publicado. Tente novamente mais tarde.';

            addEditionVisual(input, briefing);

            const response = input.responseBuilder
                .speak(speech)
                .withShouldEndSession(true)
                .getResponse();
            logEditionVisualResponse(response);
            return response;
        } catch (error) {
            const response = input.responseBuilder
                .speak(UNAVAILABLE)
                .withShouldEndSession(true)
                .getResponse();
            logEditionVisualResponse(response);
            return response;
        }
    }
};

const IntentHandler = {
    canHandle(input) {
        return input.requestEnvelope.request.type === 'IntentRequest';
    },

    handle(input) {
        const name = Alexa.getIntentName(input.requestEnvelope);

        if (['AMAZON.StopIntent', 'AMAZON.CancelIntent'].includes(name)) {
            return input.responseBuilder
                .speak('Até mais.')
                .withShouldEndSession(true)
                .getResponse();
        }

        const speech = name === 'AMAZON.HelpIntent'
            ? 'Diga: ouvir briefing, para escutar o Radar ACS mais recente.'
            : 'Não entendi. Diga: ouvir briefing, para escutar o Radar ACS.';

        return input.responseBuilder
            .speak(speech)
            .reprompt('Diga: ouvir briefing.')
            .getResponse();
    }
};

const SessionEndedHandler = {
    canHandle(input) {
        return input.requestEnvelope.request.type === 'SessionEndedRequest';
    },

    handle(input) {
        return input.responseBuilder.getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },

    handle(input, error) {
        console.error('Erro na Skill:', error.code || error.name);

        if (input.requestEnvelope.request.task) return completeTask(input, '500', UNAVAILABLE);

        return input.responseBuilder
            .speak(UNAVAILABLE)
            .withShouldEndSession(true)
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        BriefingTaskHandler,
        LaunchRequestHandler,
        IntentHandler,
        SessionEndedHandler
    )
    .addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .withCustomUserAgent('radar-acs/mvp')
    .lambda();
