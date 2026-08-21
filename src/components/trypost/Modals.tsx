import { SchedulePostModal, CarouselGenerateModal, BulkScheduleModal, WorkflowCreateModal } from "./ScheduleModals";
import { CaptionGeneratorModal, HashtagSuggesterModal, BestTimeModal, TrendingModal } from "./V3ToolModals";
import { MediaLibraryModal, TemplatesModal, ApprovalsModal, ExportPostsModal } from "./V3MoreModals";

type ModalsProps = {
  scheduleModal: boolean;
  setScheduleModal: (v: boolean) => void;
  carouselModal: boolean;
  setCarouselModal: (v: boolean) => void;
  bulkModal: boolean;
  setBulkModal: (v: boolean) => void;
  workflowModal: boolean;
  setWorkflowModal: (v: boolean) => void;
  v3Modal: null | "caption" | "hashtags" | "besttime" | "media" | "templates" | "trending" | "approvals" | "export";
  setV3Modal: (m: any) => void;
  platforms: any[];
  scheduleForm: any;
  setScheduleForm: (f: any) => void;
  carouselForm: any;
  setCarouselForm: (f: any) => void;
  bulkText: string;
  setBulkText: (t: string) => void;
  workflowForm: any;
  setWorkflowForm: (f: any) => void;
  bestTimes: any;
  trending: any;
  templates: any;
  media: any;
  pendingApprovals: any;
  exportPosts: any;
};

export function Modals({
  scheduleModal,
  setScheduleModal,
  carouselModal,
  setCarouselModal,
  bulkModal,
  setBulkModal,
  workflowModal,
  setWorkflowModal,
  v3Modal,
  setV3Modal,
  platforms,
  scheduleForm,
  setScheduleForm,
  carouselForm,
  setCarouselForm,
  bulkText,
  setBulkText,
  workflowForm,
  setWorkflowForm,
  bestTimes,
  trending,
  templates,
  media,
  pendingApprovals,
  exportPosts,
}: ModalsProps) {
  return (
    <>
      {scheduleModal && (
        <SchedulePostModal
          scheduleForm={scheduleForm}
          setScheduleForm={setScheduleForm}
          platforms={platforms}
          onClose={() => setScheduleModal(false)}
        />
      )}

      {carouselModal && (
        <CarouselGenerateModal
          carouselForm={carouselForm}
          setCarouselForm={setCarouselForm}
          platforms={platforms}
          onClose={() => setCarouselModal(false)}
        />
      )}

      {bulkModal && (
        <BulkScheduleModal
          bulkText={bulkText}
          setBulkText={setBulkText}
          onClose={() => setBulkModal(false)}
        />
      )}

      {workflowModal && (
        <WorkflowCreateModal
          workflowForm={workflowForm}
          setWorkflowForm={setWorkflowForm}
          platforms={platforms}
          onClose={() => setWorkflowModal(false)}
        />
      )}

      {v3Modal === "caption" && (
        <CaptionGeneratorModal
          platforms={platforms}
          setScheduleForm={setScheduleForm}
          scheduleForm={scheduleForm}
          setScheduleModal={setScheduleModal}
          onClose={() => setV3Modal(null)}
        />
      )}

      {v3Modal === "hashtags" && (
        <HashtagSuggesterModal
          platforms={platforms}
          setScheduleForm={setScheduleForm}
          scheduleForm={scheduleForm}
          onClose={() => setV3Modal(null)}
        />
      )}

      {v3Modal === "besttime" && <BestTimeModal bestTimes={bestTimes} onClose={() => setV3Modal(null)} />}

      {v3Modal === "trending" && <TrendingModal trending={trending} onClose={() => setV3Modal(null)} />}

      {v3Modal === "media" && <MediaLibraryModal media={media} onClose={() => setV3Modal(null)} />}

      {v3Modal === "templates" && (
        <TemplatesModal
          templates={templates}
          setScheduleForm={setScheduleForm}
          scheduleForm={scheduleForm}
          setScheduleModal={setScheduleModal}
          onClose={() => setV3Modal(null)}
        />
      )}

      {v3Modal === "approvals" && (
        <ApprovalsModal pendingApprovals={pendingApprovals} onClose={() => setV3Modal(null)} />
      )}

      {v3Modal === "export" && <ExportPostsModal exportPosts={exportPosts} onClose={() => setV3Modal(null)} />}
    </>
  );
}
