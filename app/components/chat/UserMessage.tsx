/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';
import { Markdown } from './Markdown';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import type {
  TextUIPart,
  ReasoningUIPart,
  ToolInvocationUIPart,
  SourceUIPart,
  FileUIPart,
  StepStartUIPart,
} from '@ai-sdk/ui-utils';

interface UserMessageProps {
  content: string | Array<{ type: string; text?: string; image?: string }>;
  parts:
    | (TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart | FileUIPart | StepStartUIPart)[]
    | undefined;
}

export function UserMessage({ content, parts }: UserMessageProps) {
  const profile = useStore(profileStore);

  // Extract images from parts - look for file parts with image mime types
  const images =
    parts?.filter(
      (part): part is FileUIPart => part.type === 'file' && 'mimeType' in part && part.mimeType.startsWith('image/'),
    ) || [];

  if (Array.isArray(content)) {
    const textItem = content.find((item) => item.type === 'text');
    const textContent = stripMetadata(textItem?.text || '');

    return (
      <div className="overflow-hidden flex flex-col gap-2 items-end w-full">
        <div className="flex flex-row items-center gap-2 self-end">
          {profile?.avatar || profile?.username ? (
            <div className="flex items-center gap-2">
              <span className="text-bolt-elements-textSecondary text-xs font-medium">
                {profile?.username ? profile.username : ''}
              </span>
              <img
                src={profile.avatar}
                alt={profile?.username || 'User'}
                className="w-6 h-6 object-cover rounded-full"
                loading="eager"
                decoding="sync"
              />
            </div>
          ) : (
            <div className="i-ph:user-fill text-accent-500 text-lg" />
          )}
        </div>
        <div className="flex flex-col gap-3 bg-accent-500/10 p-4 max-w-[85%] rounded-2xl rounded-tr-md">
          {textContent && <Markdown html>{textContent}</Markdown>}
          {images.map((item, index) => (
            <img
              key={index}
              src={`data:${item.mimeType};base64,${item.data}`}
              alt={`Image ${index + 1}`}
              className="max-w-full h-auto rounded-xl"
              style={{ maxHeight: '512px', objectFit: 'contain' }}
            />
          ))}
        </div>
      </div>
    );
  }

  const textContent = stripMetadata(content);

  return (
    <div className="flex flex-col bg-accent-500/10 px-5 py-4 max-w-[85%] rounded-2xl rounded-tr-md ml-auto">
      {images.length > 0 && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {images.map((item, index) => (
            <div
              key={index}
              className="relative flex rounded-xl border border-bolt-elements-borderColor overflow-hidden"
            >
              <div className="h-16 w-16 bg-transparent outline-none">
                <img
                  src={`data:${item.mimeType};base64,${item.data}`}
                  alt={`Image ${index + 1}`}
                  className="h-full w-full rounded-xl"
                  style={{ objectFit: 'fill' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <Markdown html>{textContent}</Markdown>
    </div>
  );
}

function stripMetadata(content: string) {
  const artifactRegex = /<boltArtifact\s+[^>]*>[\s\S]*?<\/boltArtifact>/gm;
  return content.replace(MODEL_REGEX, '').replace(PROVIDER_REGEX, '').replace(artifactRegex, '');
}
