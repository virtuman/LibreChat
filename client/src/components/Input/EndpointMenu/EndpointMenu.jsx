/* eslint-disable react-hooks/exhaustive-deps */
import { useRecoilState } from 'recoil';
import { useState, useEffect } from 'react';
import {
  useDeletePresetMutation,
  useCreatePresetMutation,
  useGetEndpointsQuery,
} from 'librechat-data-provider/react-query';
import { Icon } from '~/components/Endpoints';
import EndpointItems from './EndpointItems';
import PresetItems from './PresetItems';
import FileUpload from './FileUpload';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Dialog,
  DialogTrigger,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '~/components/ui/';
import DialogTemplate from '~/components/ui/DialogTemplate';
import { cn, cleanupPreset, mapEndpoints } from '~/utils';
import { useLocalize, useLocalStorage, useConversation, useDefaultConvo } from '~/hooks';
import store from '~/store';

export default function NewConversationMenu() {
  const localize = useLocalize();
  const getDefaultConversation = useDefaultConvo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  const [showEndpoints, setShowEndpoints] = useState(true);
  const [conversation, setConversation] = useRecoilState(store.conversation) ?? {};
  const [messages, setMessages] = useRecoilState(store.messages);

  const { data: availableEndpoints = [] } = useGetEndpointsQuery({
    select: mapEndpoints,
  });

  const [presets, setPresets] = useRecoilState(store.presets);
  const modularEndpoints = new Set(['gptPlugins', 'anthropic', 'google', 'openAI']);

  const { endpoint } = conversation;
  const { newConversation } = useConversation();

  const deletePresetsMutation = useDeletePresetMutation();
  const createPresetMutation = useCreatePresetMutation();

  const importPreset = (jsonData) => {
    createPresetMutation.mutate(
      { ...jsonData },
      {
        onSuccess: (data) => {
          setPresets(data);
        },
        onError: (error) => {
          console.error('Error uploading the preset:', error);
        },
      },
    );
  };

  const onFileSelected = (jsonData) => {
    const jsonPreset = { ...cleanupPreset({ preset: jsonData }), presetId: null };
    importPreset(jsonPreset);
  };

  // save states to localStorage
  const [newUser, setNewUser] = useLocalStorage('newUser', true);
  const [lastModel, setLastModel] = useLocalStorage('lastSelectedModel', {});
  const setLastConvo = useLocalStorage('lastConversationSetup', {})[1];
  const [lastBingSettings, setLastBingSettings] = useLocalStorage('lastBingSettings', {});
  useEffect(() => {
    if (endpoint && endpoint !== 'bingAI') {
      const lastModelUpdate = { ...lastModel, [endpoint]: conversation?.model };
      if (endpoint === 'gptPlugins') {
        lastModelUpdate.secondaryModel = conversation.agentOptions.model;
      }
      setLastModel(lastModelUpdate);
    } else if (endpoint === 'bingAI') {
      const { jailbreak, toneStyle } = conversation;
      setLastBingSettings({ ...lastBingSettings, jailbreak, toneStyle });
    }

    setLastConvo(conversation);
  }, [conversation]);

  // set the current model
  const onSelectEndpoint = (newEndpoint) => {
    setMenuOpen(false);
    if (!newEndpoint) {
      return;
    } else {
      newConversation(null, { endpoint: newEndpoint });
    }
  };

  // set the current model
  const isModular = modularEndpoints.has(endpoint);
  const onSelectPreset = (newPreset) => {
    setMenuOpen(false);
    if (!newPreset) {
      return;
    }

    if (
      isModular &&
      modularEndpoints.has(newPreset?.endpoint) &&
      endpoint === newPreset?.endpoint
    ) {
      const currentConvo = getDefaultConversation({
        conversation,
        preset: newPreset,
      });

      setConversation(currentConvo);
      setMessages(messages);
      return;
    }

    newConversation({}, newPreset);
  };

  const clearAllPresets = () => {
    deletePresetsMutation.mutate({ arg: {} });
  };

  const onDeletePreset = (preset) => {
    deletePresetsMutation.mutate({ arg: preset });
  };

  const icon = Icon({
    size: 32,
    ...conversation,
    error: false,
    button: true,
  });

  const onOpenChange = (open) => {
    setMenuOpen(open);
    if (newUser) {
      setNewUser(false);
    }
  };

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <Dialog className="z-[100]">
          <DropdownMenu open={menuOpen} onOpenChange={onOpenChange}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  id="new-conversation-menu"
                  data-testid="new-conversation-menu"
                  variant="outline"
                  className={
                    'group relative mb-[-12px] ml-1 mt-[-8px] items-center rounded-md border-0 p-1 outline-none focus:ring-0 focus:ring-offset-0 dark:data-[state=open]:bg-opacity-50 md:left-1 md:ml-0 md:ml-[-12px] md:pl-1'
                  }
                >
                  {icon}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent forceMount={newUser} sideOffset={5}>
              {localize('com_endpoint_open_menu')}
            </TooltipContent>
            <DropdownMenuContent
              className="z-[100] w-[375px] dark:bg-gray-800 md:w-96"
              onCloseAutoFocus={(event) => event.preventDefault()}
              side="top"
            >
              <DropdownMenuLabel
                className="cursor-pointer dark:text-gray-300"
                onClick={() => setShowEndpoints((prev) => !prev)}
              >
                {showEndpoints ? localize('com_endpoint_hide') : localize('com_endpoint_show')}{' '}
                {localize('com_endpoint')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={endpoint}
                onValueChange={onSelectEndpoint}
                className="flex flex-col gap-1 overflow-y-auto"
              >
                {showEndpoints &&
                  (availableEndpoints.length ? (
                    <EndpointItems
                      selectedEndpoint={endpoint}
                      endpoints={availableEndpoints}
                      onSelect={onSelectEndpoint}
                    />
                  ) : (
                    <DropdownMenuLabel className="dark:text-gray-300">
                      {localize('com_endpoint_not_available')}
                    </DropdownMenuLabel>
                  ))}
              </DropdownMenuRadioGroup>

              <div className="mt-2 w-full" />

              <DropdownMenuLabel className="flex items-center dark:text-gray-300">
                <span
                  className="mr-auto cursor-pointer "
                  onClick={() => setShowPresets((prev) => !prev)}
                >
                  {showPresets ? localize('com_endpoint_hide') : localize('com_endpoint_show')}{' '}
                  {localize('com_endpoint_presets')}
                </span>
                <FileUpload onFileSelected={onFileSelected} />
                <Dialog>
                  <DialogTrigger asChild>
                    <label
                      htmlFor="file-upload"
                      className="mr-1 flex h-[32px] h-auto cursor-pointer  items-center rounded bg-transparent px-2 py-1 text-xs font-medium font-normal text-gray-600 transition-colors hover:bg-gray-100 hover:text-red-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-green-500"
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        className="mr-1 flex w-[22px] items-center"
                      >
                        <path d="M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0M9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1M6.854 7.146 8 8.293l1.146-1.147a.5.5 0 1 1 .708.708L8.707 9l1.147 1.146a.5.5 0 0 1-.708.708L8 9.707l-1.146 1.147a.5.5 0 0 1-.708-.708L7.293 9 6.146 7.854a.5.5 0 1 1 .708-.708"></path>
                      </svg>
                      {localize('com_ui_clear')} {localize('com_ui_all')}
                    </label>
                  </DialogTrigger>
                  <DialogTemplate
                    title={`${localize('com_ui_clear')} ${localize('com_endpoint_presets')}`}
                    description={localize('com_endpoint_presets_clear_warning')}
                    selection={{
                      selectHandler: clearAllPresets,
                      selectClasses: 'bg-red-600 hover:bg-red-700 dark:hover:bg-red-800 text-white',
                      selectText: localize('com_ui_clear'),
                    }}
                    className="max-w-[500px]"
                  />
                </Dialog>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                onValueChange={onSelectPreset}
                className={cn(
                  'overflow-y-auto overflow-x-hidden',
                  showEndpoints ? 'max-h-[210px]' : 'max-h-[315px]',
                )}
              >
                {showPresets &&
                  (presets.length ? (
                    <PresetItems
                      presets={presets}
                      onSelect={onSelectPreset}
                      onDeletePreset={onDeletePreset}
                    />
                  ) : (
                    <DropdownMenuLabel className="dark:text-gray-300">
                      {localize('com_endpoint_no_presets')}
                    </DropdownMenuLabel>
                  ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </Dialog>
      </Tooltip>
    </TooltipProvider>
  );
}
