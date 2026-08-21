import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { createContext, useContext, type ReactNode } from "react";

type TryPostActions = {
  adminToken: string;
  schedulePost: ReturnType<typeof useMutation<typeof api.trypost.schedulePost>>;
  bulkSchedule: ReturnType<typeof useMutation<typeof api.trypost.bulkSchedule>>;
  generateCarousel: ReturnType<typeof useAction<typeof api.trypost.generateCarousel>>;
  createWorkflow: ReturnType<typeof useMutation<typeof api.trypost.createWorkflow>>;
  generateCaption: ReturnType<typeof useAction<typeof api.trypost.generateCaption>>;
  suggestHashtags: ReturnType<typeof useAction<typeof api.trypost.suggestHashtags>>;
  addMedia: ReturnType<typeof useMutation<typeof api.trypost.addMedia>>;
  deleteMedia: ReturnType<typeof useMutation<typeof api.trypost.deleteMedia>>;
  createTemplate: ReturnType<typeof useMutation<typeof api.trypost.createTemplate>>;
  deleteTemplate: ReturnType<typeof useMutation<typeof api.trypost.deleteTemplate>>;
  useTemplate: ReturnType<typeof useMutation<typeof api.trypost.useTemplate>>;
  approvePost: ReturnType<typeof useMutation<typeof api.trypost.approvePost>>;
  rejectPost: ReturnType<typeof useMutation<typeof api.trypost.rejectPost>>;
  showToast: (type: "success" | "error", msg: string) => void;
};

const TryPostActionsContext = createContext<TryPostActions | null>(null);

export function TryPostActionsProvider({
  adminToken,
  showToast,
  children,
}: {
  adminToken: string;
  showToast: (type: "success" | "error", msg: string) => void;
  children: ReactNode;
}) {
  const schedulePost = useMutation(api.trypost.schedulePost);
  const bulkSchedule = useMutation(api.trypost.bulkSchedule);
  const generateCarousel = useAction(api.trypost.generateCarousel);
  const createWorkflow = useMutation(api.trypost.createWorkflow);
  const generateCaption = useAction(api.trypost.generateCaption);
  const suggestHashtags = useAction(api.trypost.suggestHashtags);
  const addMedia = useMutation(api.trypost.addMedia);
  const deleteMedia = useMutation(api.trypost.deleteMedia);
  const createTemplate = useMutation(api.trypost.createTemplate);
  const deleteTemplate = useMutation(api.trypost.deleteTemplate);
  const useTemplate = useMutation(api.trypost.useTemplate);
  const approvePost = useMutation(api.trypost.approvePost);
  const rejectPost = useMutation(api.trypost.rejectPost);

  return (
    <TryPostActionsContext.Provider
      value={{
        adminToken,
        schedulePost,
        bulkSchedule,
        generateCarousel,
        createWorkflow,
        generateCaption,
        suggestHashtags,
        addMedia,
        deleteMedia,
        createTemplate,
        deleteTemplate,
        useTemplate,
        approvePost,
        rejectPost,
        showToast,
      }}
    >
      {children}
    </TryPostActionsContext.Provider>
  );
}

export function useTryPostActions() {
  const ctx = useContext(TryPostActionsContext);
  if (!ctx) throw new Error("useTryPostActions must be used within TryPostActionsProvider");
  return ctx;
}
