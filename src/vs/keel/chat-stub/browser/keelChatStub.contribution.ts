/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InstantiationType, registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { IAgentNetworkFilterService } from '../../../platform/networkFilter/common/networkFilterService.js';
import { IChatAgentService } from '../../../workbench/contrib/chat/common/participants/chatAgents.js';
import { ILanguageModelsService } from '../../../workbench/contrib/chat/common/languageModels.js';
import { IChatService } from '../../../workbench/contrib/chat/common/chatService/chatService.js';
import { IChatWidgetService } from '../../../workbench/contrib/chat/browser/chat.js';
import { IChatContextPickService } from '../../../workbench/contrib/chat/browser/attachments/chatContextPickService.js';
import { ILanguageModelToolsService } from '../../../workbench/contrib/chat/common/tools/languageModelToolsService.js';
import { KeelAgentNetworkFilterServiceStub } from './keelAgentNetworkFilterServiceStub.js';
import { KeelChatAgentServiceStub } from './keelChatAgentServiceStub.js';
import { KeelChatContextPickServiceStub } from './keelChatContextPickServiceStub.js';
import { KeelChatServiceStub } from './keelChatServiceStub.js';
import { KeelChatWidgetServiceStub } from './keelChatWidgetServiceStub.js';
import { KeelLanguageModelsServiceStub } from './keelLanguageModelsServiceStub.js';
import { KeelLanguageModelToolsServiceStub } from './keelLanguageModelToolsServiceStub.js';

/**
 * Registriert die Keel-Chat-Stub-Services.
 *
 * Hintergrund:
 *   Mit D-013 wurde der komplette VSCode-Chat deaktiviert. Die
 *   `chat.contribution.ts`-Imports sind auskommentiert, damit werden die dortigen
 *   `registerSingleton`-Aufrufe fuer alle Chat-Services nie ausgefuehrt. Dritte
 *   Contributions (Notebook-Chat, InlineChat-DefaultModel, TaskService,
 *   browserView-Tools, ChatContext-Suche/Markers/SCM/Debug/Mcp, Extensions-Tools,
 *   ...) injecten diese Services weiterhin per Constructor-Parameter - ohne Stub
 *   crashed deren Contribution-Registration.
 *
 * Strategie:
 *   Keel liefert leere No-Op-Implementierungen, die die Interfaces vollstaendig
 *   erfuellen, aber keine Funktionalitaet bereitstellen. Konsequenz: Chat-Features
 *   schlagen still fehl (leere Listen, abgelehnte Sends), der Boot ist sauber.
 *   Ein echter Keel-Chat kommt spaeter ueber `@keel/core`.
 *
 * Gestubbte Services (Reihenfolge wie Upstream-Registrierung in chat.contribution.ts):
 *   - IChatService (11 Boot-Errors via taskService/UpdateTitleBar)
 *   - IChatWidgetService (1 Boot-Error via NotebookChatContribution)
 *   - IChatAgentService (Notebook-Chat, TaskService transitiv)
 *   - ILanguageModelsService (InlineChatDefaultModel)
 *   - ILanguageModelToolsService (6 Boot-Errors: InlineChatEscapeTool, McpTools,
 *       TestingChatAgentTool, Extensions, browserView.chatAgentTools,
 *       terminal.chatAgentTools)
 *   - IChatContextPickService / IContextPickService (5 Boot-Errors via Search, SCM,
 *       Debug, Markers, Mcp-ChatContextContributions)
 *   - IAgentNetworkFilterService (browserView-Tools)
 *
 * @invariant InstantiationType.Delayed - identisch zur Upstream-Registrierung.
 */
registerSingleton(IChatService, KeelChatServiceStub, InstantiationType.Delayed);
registerSingleton(IChatWidgetService, KeelChatWidgetServiceStub, InstantiationType.Delayed);
registerSingleton(IChatAgentService, KeelChatAgentServiceStub, InstantiationType.Delayed);
registerSingleton(ILanguageModelsService, KeelLanguageModelsServiceStub, InstantiationType.Delayed);
registerSingleton(ILanguageModelToolsService, KeelLanguageModelToolsServiceStub, InstantiationType.Delayed);
registerSingleton(IChatContextPickService, KeelChatContextPickServiceStub, InstantiationType.Delayed);
registerSingleton(IAgentNetworkFilterService, KeelAgentNetworkFilterServiceStub, InstantiationType.Delayed);
