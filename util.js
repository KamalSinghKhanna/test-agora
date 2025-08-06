import {
  Box,
  Card,
  CardBody,
  Image,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure,
  useOutsideClick,
  PopoverHeader,
  PopoverBody,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  // Button,
} from "@chakra-ui/react";
import { Switch } from "@design/Switch";

import React, { useState, useRef, useEffect, useContext } from "react";

import { sample } from "lodash";
import { useParams } from "react-router-dom";
import {
  ToastContext,
  ToastContextType,
} from "@container/context/ToastContext";
import { ToastContainer, toast } from "react-toastify";
import styles from "./HighlightCreator.module.css";
import utilityService from "../../../../../../services/utility.service";
import highlightService from "../../../../../decodetranscript/src/services/highlight.service";
import transcriptService from "../../../../../decodetranscript/src/services/transcript.service";
import playIcon from "../../../../assets/play.svg";
import recordingIcon from "../../../../assets/recording.svg";
import { usefeatureFlagContext } from "../../../../../container/src/context/FeatureFlagContext";
import trackService from "../../../../../../services/track.service";
import EditIcon from "../../../../../container/src/assets/images/menu-bar/edit.svg";
import Button from "../../../../../design/Atoms/Button/Button";
import AddIcon from "../../../../assets/add.svg";
import transcriptService from "../../../../../decodetranscript/src/services/transcript.service";

const TAGS_COLORS = [
  "#a093ff",
  "#ff516b",
  "#6abdc9",
  "#fc685a",
  "#4d54e5",
  "#263771",
  "#832161",
  "#97B6B6",
];
const HIGHLIGHT_COLORS = [
  "CCC5FF",
  "FFABB9",
  "B9E5EC",
  "FFB7B0",
  "A9ADFB",
  "B2BBD0",
  "D09BBE",
  "DBECEC",
];

function formatTimeInMmSs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const HighlightCreator = ({
  transcript = {},
  handleTranscriptClick,
  currentMediaHighlights,
  setTranscripts,
  setHighlights,
  highlights,
  currentPlayingTime,
  evalKey,
  setEvalKey,
  speakersList,
  setSpeakersList,
  allTranscripts,
  showTranslatedText,
}) => {
  const [isOpenPopover, setIsOpenPopover] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState<any>({});
  const [popoverTags, setPopoverTags] = useState<any>([]);
  const transTextNode = useRef<any>();
  const inputRef = useRef<any>();
  const [selectedText, setSelectedText] = useState("");
  const [textWithHighlightSection, setTextWithHighlightSection] =
    useState<any>();
  const [tagName, setTagName] = useState("");
  const [isTagValid, setIsTagValid] = useState(true);
  const [tagError, setTagError] = useState("");
  const orgId: any = sessionStorage.getItem("current_organisation_id")
    ? JSON.parse(sessionStorage.getItem("current_organisation_id"))
    : null;
  const { mediaId } = useParams();
  const [newlyAddedTags, setNewlyAddedTags] = useState([] as any);
  const { showToast } = useContext(ToastContext) as ToastContextType;
  const [activePopoverId, setActivePopoverId] = useState(null);
  const [currentTags, setCurrentTags] = useState([]);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const { featureFlag } = usefeatureFlagContext();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: modalIsOpen,
    onOpen: modalOnOpen,
    onClose: modalOnClose,
  } = useDisclosure();
  const [transcriptSpeaker, setTranscriptSpeaker] = useState("");
  const notifyToast = (message, type) =>
    toast(
      <Box>
        <Text>{message}</Text>
      </Box>,
      {
        position: "top-right",
        autoClose: 1500,
        hideProgressBar: true,
        newestOnTop: false,
        closeOnClick: true,
        rtl: false,
        pauseOnFocusLoss: true,
        draggable: true,
        pauseOnHover: true,
        type: type,
        theme: "colored",
        toastId: "custom-id-yes",
      }
    );

  useOutsideClick({
    ref: inputRef,
    handler: () => {
      if (activePopoverId === transcript.transcript_id) {
        setPopoverTags([]);
        setActivePopoverId(null);
        setIsOpenPopover(false);
        setSelectedText("");
        setCurrentHighlight({});
        setTagName("");
        setNewlyAddedTags([]);
        setTagError("");
        setSuggestedTags([]);
      }
    },
  });

  const handleHighlightClick = (e: any) => {
    const hid = e.target.getAttribute("data-highlight");
    if (hid === null) {
      return;
    }
    const hidArray = hid.split(",");
    const currentSelectedHighlights = highlights.find((h) =>
      hidArray.includes(h.highlight_id)
    );

    if (!currentHighlight && Object.keys(currentHighlight).length === 0) {
      return; // Return if no matching highlight found
    }
    const selectedTag = Object.values(currentSelectedHighlights.tag_dict);
    setPopoverTags([...selectedTag]);
    setCurrentHighlight(currentSelectedHighlights);
    setIsOpenPopover(true);
    setActivePopoverId(transcript.transcript_id);
  };

  const onlyUnique = (value: string, index: number, array: any) =>
    array.indexOf(value) === index;

  const getUniqueColor = (sampleSpace: any, selectedSamples: any) => {
    const selectedColor = selectedSamples
      .map(({ color_code }: any) => color_code)
      .filter(onlyUnique);
    const newSampleSpace = sampleSpace.filter(
      (color: string) => !selectedColor.includes(color)
    );
    return sample(
      newSampleSpace.length === sampleSpace.length ||
        newSampleSpace.length === 0
        ? sampleSpace
        : newSampleSpace
    );
  };

  const generateRandomColorForHighlights = () =>
    getUniqueColor(HIGHLIGHT_COLORS, currentMediaHighlights);

  const generateRandomColorForTags = () =>
    getUniqueColor(TAGS_COLORS, currentTags);

  const onTextSelection = (e, isOnMouseUp?: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    const selection = window.getSelection() as Selection;
    if (selection?.toString().length > 0) {
      const range = selection?.getRangeAt(0) as Range;
      const highlightText = selection.toString();
      if (!transcript?.transcript_text?.includes(highlightText)) {
        return;
      }

      if (highlightText.split(" ").length <= 4 && highlightText.length > 0) {
        notifyToast("Please select more than 4 words", "error");
        return;
      }
        // setIsOpenPopover(true);
        // setActivePopoverId(transcript.transcript_id);
        // setSelectedText(highlightText);
      const dummyElement: HTMLElement = window.document.createElement("span");
      if (highlightText && highlightText !== "") {
        dummyElement.className = "selectedText_background";
        dummyElement.style.background = "#ADC8E4";
        setIsOpenPopover(true);
        setActivePopoverId(transcript.transcript_id);
        setSelectedText(highlightText);
      }
      const rangeContents: any = range.extractContents();
      rangeContents.childNodes.forEach((node: any) => {
        if (node.nodeName != "#text") {
          node.replaceWith(document.createTextNode(node.textContent || ""));
        }
      });
      dummyElement.appendChild(rangeContents);
      // remove this when implementing selection
      range.insertNode(dummyElement);
    }
  };

  const isTimeInRange = (
    time: string,
    { start_time, end_time }: { start_time: string; end_time: string }
  ) => time >= start_time && time <= end_time;

  const createSelectedText = () => {
    const updatedTranscriptWords = transcript?.transcript_word_items;
    if (!updatedTranscriptWords) {
      return ""; // Return empty string if there are no words
    }
    console.log(updatedTranscriptWords, "42030")
    const updatedSpanElement = updatedTranscriptWords.map((spanItem: any) => {
      const tempContainer = document.createElement("div");
      const startTime = spanItem.start_time;
      const endTime = spanItem.end_time;
      tempContainer.innerHTML = `<span data-end-time=${endTime} data-start-time=${startTime}> ${spanItem.word_text} </span>`;
      const spanElement = tempContainer.firstElementChild as HTMLElement;

      // Find the corresponding highlight
      const highlight = currentMediaHighlights.filter(
        (h: any) =>
          isTimeInRange(startTime, {
            start_time: h.highlight_start_time,
            end_time: h.highlight_end_time,
          }) &&
          isTimeInRange(endTime, {
            start_time: h.highlight_start_time,
            end_time: h.highlight_end_time,
          })
      );
      if (highlight.length > 0 && spanElement) {
        spanElement.setAttribute(
          "style",
          `background-color:#${highlight[0].highlight_color}`
        );
        if (highlight.length === 1) {
          spanElement.dataset.highlight = highlight[0].highlight_id;
        } else {
          spanElement.dataset.highlight = highlight
            .map((h: any) => h.highlight_id)
            .join(",");
        }
      }
      return spanElement?.outerHTML;
    });
    // Joining the array into a single string
    return updatedSpanElement.join("");
  };

  const onTagSubmit = async (newTag) => {
    if (newTag.length === 0) {
      return;
    }
    let currentTagId = "";
    let currentTagHighlightId = "";
    const textIndex = transcript.transcript_text.indexOf(selectedText);
    const randomHighlightColor = generateRandomColorForHighlights();
    // use this for creating highlight
    const highlightJson = {
      transcript_id: transcript.transcript_id,
      selected_text: selectedText.trim(),
      range: `${textIndex}-${textIndex + selectedText.length}`,
      color: randomHighlightColor,
      media_id: mediaId,
      organisation_id: orgId,
      created_by: utilityService.getUserId(),
    };
    if (currentHighlight?.highlight_id) {
      if (newTag.length) {
        const payload = {
          media_id: mediaId,
          transcript_id: transcript.transcript_id,
          highlight_id: currentHighlight.highlight_id,
          tag_start_time: parseInt(currentHighlight.highlight_start_time),
          tag_end_time: parseInt(currentHighlight.highlight_end_time),
          tag_data: newTag.map(({ tag_id, ...rest }) => rest) || [],
          organisation_id: orgId,
        };
        highlightService
          .createTags(payload)
          .then((res) => {
            setTagError("");
            const payload = {
              media_id: mediaId,
              page_size: 10000,
              all_transcripts: false,
              last_evaluated_key: {},
            };
            currentTagHighlightId = currentHighlight.highlight_id;
            currentTagId = res.data.data?.tags?.tag_id;
            const newlyAddedTag = {
              ...newTag[0],
              tag_id: currentTagId,
              media_id: mediaId,
              highlight_id: currentTagHighlightId,
            };
            setNewlyAddedTags((prev) => [newlyAddedTag, ...prev]);
            setPopoverTags((prev) => [newlyAddedTag, ...prev]);
            trackService.trackEvent("Tag_Added", {
              media_id: mediaId,
              highlight_id: currentHighlight.highlight_id,
            });

            highlightService
              .fetchHighlights(mediaId, orgId)
              .then((res: any) => {
                setHighlights(
                  res.data.data.highlights_data.map((item: any) => ({
                    ...item,
                    tag_dict: Object.fromEntries(
                      Object.entries(item.tag_dict).filter(
                        ([_, value]: any) => !value.is_deleted
                      )
                    ),
                  }))
                );
              });
            transcriptService.getTranscripts(payload).then((res: any) => {
              setTranscripts(res.data.data.transcripts);
              setEvalKey(res.data.data.last_evaluated_key);
            });
            notifyToast("Tags Added Successfully.", "success");
          })
          .catch((error: any) => {
            notifyToast(error?.response?.data?.message, "error");
          });
      }
    } else if (newTag.length > 0) {
      highlightJson["tag_list"] =
        newTag.map(({ tag_id, ...rest }) => rest) || [];
      highlightService
        .createHighlight(highlightJson)
        .then((res) => {
          setTagName("");
          setTagError("");

          const payload = {
            media_id: mediaId,
            page_size: 10000,
          };
          const responseKeys = Object.keys(res.data.data?.tag_dict || {});
          const tagKeys = responseKeys[0];
          currentTagId = res.data.data?.tag_dict[tagKeys]?.tag_id;
          currentTagHighlightId =
            res.data.data?.tag_dict[tagKeys]?.highlight_id;
          const newlyAddedTag = {
            ...newTag[0],
            tag_id: currentTagId,
            media_id: mediaId,
            highlight_id: currentTagHighlightId,
          };
          setNewlyAddedTags((prev) => [newlyAddedTag, ...prev]);
          setPopoverTags((prev) => [newlyAddedTag, ...prev]);
          transcriptService.getTranscripts(payload).then((res: any) => {
            setTranscripts(res.data.data.transcripts);
            setEvalKey(res.data.data.last_evaluated_key);
            notifyToast("Highlights Created Successfully.", "success");
            highlightService
              .fetchHighlights(mediaId, orgId)
              .then((res: any) => {
                setHighlights(
                  res.data.data.highlights_data.map((item: any) => ({
                    ...item,
                    tag_dict: Object.fromEntries(
                      Object.entries(item.tag_dict).filter(
                        ([_, value]: any) => !value.is_deleted
                      )
                    ),
                  }))
                );
              });
          });
          trackService.trackEvent("Highlights_Created", {
            media_id: mediaId,
            highlight_id: res.data.data?.highlight_id,
          });
        })
        .catch((error: any) => {
          notifyToast(error?.response?.data?.message, "error");
        });
    }
  };

  const handleToggleTag = (e, tag) => {
    const { checked } = e.target;
    try {
      if (!checked) {
        setPopoverTags((prev) =>
          prev.map((t) =>
            t.tag_id === tag.tag_id
              ? {
                  ...t,
                  is_deleted: true,
                }
              : t
          )
        );
        setNewlyAddedTags((prev) =>
          prev.filter((t) => t.tag_id !== tag.tag_id)
        );
        setCurrentTags((prev) => prev.filter((t) => t.tag_id !== tag.tag_id));
        highlightService
          .deleteTag(tag.media_id, tag.highlight_id, tag.tag_id)
          .then(() => {
            const payload = {
              media_id: mediaId,
              page_size: 10000,
            };
            transcriptService.getTranscripts(payload).then((res: any) => {
              setTranscripts(res.data.data.transcripts);
              setEvalKey(res.data.data.last_evaluated_key);
              highlightService
                .fetchHighlights(mediaId, orgId)
                .then((res: any) => {
                  setHighlights(
                    res.data.data.highlights_data.map((item: any) => ({
                      ...item,
                      tag_dict: Object.fromEntries(
                        Object.entries(item.tag_dict).filter(
                          ([_, value]: any) => !value.is_deleted
                        )
                      ),
                    }))
                  );
                });
            });
          })
          .catch((error) => {
            notifyToast(error?.response?.data?.message, "error");
          });
      } else {
        setPopoverTags((prev) =>
          prev.map((t) =>
            t.tag_id === tag.tag_id
              ? {
                  tag_name: t.tag_name,
                  tag_colour: t.tag_colour,
                  tag_id: t.tag_id,
                }
              : t
          )
        );
        setNewlyAddedTags((prev) => {
          if (prev.findIndex((t) => t.tag_id === tag.tag_id) !== -1) {
            return prev.filter((t) => t.tag_id !== tag.tag_id);
          }
          return [
            ...prev,
            {
              tag_name: tag.tag_name,
              tag_colour: tag.tag_colour,
              tag_id: tag.tag_id,
            },
          ];
        });
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleTagsCreation = (suggestedTag?: any, tagColor?: any) => {
    if (!suggestedTag) {
      if (tagName.length < 3 || tagName.length > 20) {
        notifyToast(
          "Please enter tag name greater than 3 and less than 21 characters",
          "error"
        );
        setIsOpenPopover(false);
        setTagName("");
        return;
      }
    }
    if (popoverTags.length >= 5) {
      notifyToast("Only 5 tags can be created per highlight", "error");
      return;
    }
    const newTag = {
      tag_name: suggestedTag || tagName,
      tag_colour: tagColor || generateRandomColorForTags(),
    };
    const newTagList = [newTag];
    setTagName("");
    onTagSubmit(newTagList);
  };

  useEffect(() => {
    setTextWithHighlightSection(createSelectedText());
  }, [transcript, currentMediaHighlights]);

  useEffect(() => {
    setCurrentTags(
      transcript?.highlights
        ?.map((highlight) =>
          Object.keys(highlight.tag_dict || {})
            .map((key) => ({
              tag_name: highlight.tag_dict[key]?.tag_name,
              tag_colour: highlight.tag_dict[key]?.tag_colour,
              tag_id: key,
              is_deleted: highlight.tag_dict[key]?.is_deleted,
            }))
            .filter((tag) => !tag.is_deleted)
        )
        .flat() || []
    );
  }, [transcript]);
  useEffect(() => {
    if (tagName.length > 2 && featureFlag["SUGGESTED_TAGS_50938"]) {
      highlightService.getTagsForMedia(tagName).then((response) => {
        setSuggestedTags(response.data.data);
      });
    }
  }, [tagName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        transTextNode.current &&
        !transTextNode.current.contains(event.target as Node)
      ) {
        // Remove any highlight spans (background)
        const highlights = transTextNode.current.querySelectorAll(
          ".selectedText_background"
        );
        highlights.forEach((span: HTMLElement) => {
          const parent = span.parentNode;
          if (parent) {
            const textNode = document.createTextNode(span.textContent || "");
            parent.replaceChild(textNode, span);
            parent.normalize(); // Merge adjacent text nodes
          }
        });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const addNewUsernameInSpeakerList = (speakerName, speakerMediaId) => {
    const updatedUserData = {
      media_id: speakerMediaId,
      transcript_id: transcript.transcript_id,
      transcript_speaker: speakerName,
      organisation_id: orgId,
    };
    const replacedSpeakersList = speakersList.filter(
      (speaker) => speaker.transcript_speaker !== speakerName
    );
    setSpeakersList([...replacedSpeakersList, updatedUserData]);
    highlightService.fetchHighlights(speakerMediaId, orgId).then((res: any) => {
      setHighlights(
        res.data.data.highlights_data.map((item: any) => ({
          ...item,
          tag_dict: Object.fromEntries(
            Object.entries(item.tag_dict).filter(
              ([_, value]: any) => !value.is_deleted
            )
          ),
        }))
      );
    });
  };

  const handleSpeakerNameEdition = (isReplaceAllSpeaker: Boolean) => {
    const payload = {
      media_id: transcript.media_id || "",
      name: transcript.transcript_speaker || "",
      organisation_id: orgId,
      updated_name: transcriptSpeaker,
    };
    if (!isReplaceAllSpeaker) {
      payload["transcript_id"] = transcript?.transcript_id || "";
    }
    transcriptService.updateSpeakerName(payload).then((res) => {
      setTranscriptSpeaker("");
      notifyToast("Speaker name changed", "success");
      addNewUsernameInSpeakerList(res.data.data?.name, res.data.data?.media_id);
      handleReplaceSpeakerName(
        transcript?.transcript_id,
        res.data.data.name,
        isReplaceAllSpeaker
      );
    });
  };
  const handleReplaceSpeakerName = (
    transcriptID,
    updatedName,
    isReplaceAllSpeaker
  ) => {
    let arrayOfUpdatedSpeakerName;
    if (isReplaceAllSpeaker) {
      arrayOfUpdatedSpeakerName = allTranscripts.map((item) => {
        if (item.transcript_speaker === transcript.transcript_speaker) {
          return { ...item, transcript_speaker: updatedName };
        } else {
          return item;
        }
      });
    } else {
      arrayOfUpdatedSpeakerName = allTranscripts.map((item) => {
        if (item.transcript_id === transcriptID) {
          return { ...item, transcript_speaker: updatedName };
        } else {
          return item;
        }
      });
    }
    setTranscripts(arrayOfUpdatedSpeakerName);
  };

  return (
    <>
      <ConfirmationModalSpeakerName
        modalIsOpen={modalIsOpen}
        modalOnClose={modalOnClose}
        handleSpeakerNameEdition={handleSpeakerNameEdition}
        speakerName={transcript.transcript_speaker}
        updatedSpeakerName={transcriptSpeaker}
        setTranscriptSpeaker={setTranscriptSpeaker}
      />
      <Card
        className={`${styles["highlight-creator-card"]} ${
          currentPlayingTime * 1000 >= transcript.transcript_start_time &&
          currentPlayingTime * 1000 < transcript.transcript_end_time
            ? styles["highlight-creator-card--current"]
            : ""
        } `}
        data-transcript-id={transcript.transcript_id}
        onClick={() => handleTranscriptClick(transcript.transcript_start_time)}
      >
        <CardBody className={styles["highlight-creator-card-body"]}>
          <Box className={styles["transcript-speaker"]}>
            <Box
              className={styles["transcript__icon"]}
              style={{
                backgroundPosition:
                  currentPlayingTime * 1000 >=
                    transcript.transcript_start_time &&
                  currentPlayingTime * 1000 < transcript.transcript_end_time
                    ? `0px -160px`
                    : `0px -128px`,
              }}
              cursor="pointer"
              onClick={() =>
                handleTranscriptClick(transcript.transcript_start_time)
              }
            />
            <Text>{transcript.transcript_speaker}</Text>
            <Image
              className={styles["editicon"]}
              onClick={() => {
                onOpen();
              }}
              src={EditIcon}
            />
            <PopoverEditSpeaker
              isOpen={isOpen}
              onOpen={onOpen}
              onClose={onClose}
              transcriptSpeaker={transcriptSpeaker}
              setTranscriptSpeaker={setTranscriptSpeaker}
              modalOnOpen={modalOnOpen}
              speakersList={speakersList}
              transcript={transcript}
              notifyToast={notifyToast}
            />
            <Text>{formatTimeInMmSs(transcript.transcript_start_time)}</Text>
          </Box>
          {showTranslatedText?.translationFlag ? (
            <Text>
              {transcript?.transcript_translation[showTranslatedText?.lang]}
            </Text>
          ) : (
            <>
              <Popover
                key={transcript.transcript_id}
                isOpen={isOpenPopover}
                closeOnBlur={false}
                closeOnEsc={false}
                placement="bottom"
              >
                <PopoverTrigger>
                  <Text
                    className={styles["transcript-text"]}
                    dangerouslySetInnerHTML={{
                      __html: textWithHighlightSection,
                    }}
                    onClick={(e: any) => {
                      e.detail >= 3 ? e.preventDefault() : e.stopPropagation();
                      handleHighlightClick(e, transcript.highlights);
                    }}
                    onMouseDown={(e: any) => {
                      e.detail >= 3 ? e.preventDefault() : e.stopPropagation();
                      setIsOpenPopover(false);
                    }}
                    ref={transTextNode}
                    onMouseUp={(e) => {
                      e.detail >= 3 ? e.preventDefault() : e.stopPropagation();
                      onTextSelection(e, true);
                    }}
                  />
                </PopoverTrigger>
                <PopoverContent
                  ref={inputRef}
                  className={styles["highlight-popover"]}
                >
                  <Input
                    className={styles["tag-input"]}
                    placeholder="Find or create a tag"
                    value={tagName}
                    isInvalid={!isTagValid}
                    onChange={(e) => {
                      if (e.target.value.length < 1) {
                        setSuggestedTags([]);
                      }
                      e.stopPropagation();
                      e.preventDefault();
                      setTagName(e.target.value);
                    }}
                    onKeyPress={(e) => {
                      e.key === "Enter" && handleTagsCreation();
                    }}
                  />
                  {tagName && (
                    <Box
                      className={styles["create-new-button"]}
                      onClick={() => {
                        handleTagsCreation();
                      }}
                    >
                      <Box className={styles["create-new-button--icon"]} />
                      <Text className={styles["create-new-button--text"]}>
                        {" "}
                        Create new {`"${tagName}"`}
                      </Text>
                    </Box>
                  )}

                  <Box maxHeight="140px" overflow="auto">
                    {suggestedTags?.tags?.map((tag) => {
                      return (
                        <Text
                          className={styles["suggested--tags"]}
                          onClick={() => {
                            setSuggestedTags([]);
                            handleTagsCreation(tag.tag_name, tag?.tag_colour);
                          }}
                        >
                          {tag.tag_name}
                        </Text>
                      );
                    })}
                  </Box>

                  {(popoverTags.length ||
                    suggestedTags?.tags?.length === 0 ||
                    Object.keys(suggestedTags)?.length === 0) && (
                    <Text className={styles["highlight-popover-tag--title"]}>
                      {popoverTags.length
                        ? "Current"
                        : "Add Tag to Create Highlights"}
                    </Text>
                  )}
                  <Box
                    display="flex"
                    flexDirection="column"
                    gap="12px"
                    overflow="scroll"
                  >
                    {popoverTags
                      ?.filter((tag) => !tag.is_deleted)
                      ?.map((tag) => (
                        <Box
                          className={styles["popover-highlight-tag"]}
                          key={tag?.tag_id}
                        >
                          <Text
                            className={styles["highlight-tag"]}
                            style={{
                              backgroundColor: tag?.tag_colour,
                            }}
                          >
                            {tag?.tag_name}
                          </Text>
                          <Switch
                            isChecked={!tag.is_deleted}
                            onChange={(e) => handleToggleTag(e, tag)}
                          />
                        </Box>
                      ))}
                    {popoverTags
                      ?.filter((tag) => tag.is_deleted)
                      ?.map((tag) => (
                        <Box
                          className={styles["popover-highlight-tag"]}
                          key={tag?.tag_id}
                        >
                          <Text
                            className={styles["highlight-tag"]}
                            style={{
                              backgroundColor: tag?.tag_colour,
                            }}
                          >
                            {tag?.tag_name}
                          </Text>
                          <Switch
                            isChecked={!tag.is_deleted}
                            onChange={(e) => handleToggleTag(e, tag)}
                          />
                        </Box>
                      ))}
                  </Box>
                </PopoverContent>
              </Popover>
              {currentTags?.length > 0 && (
                <Box className={styles["highlight-tags"]}>
                  {currentTags
                    .filter((t) => !t.is_deleted)
                    .map(
                      (tag, index) =>
                        index < 2 && (
                          <Text
                            key={tag?.tag_id}
                            className={styles["highlight-tag"]}
                            style={{
                              backgroundColor: tag?.tag_colour,
                            }}
                          >
                            {tag?.tag_name}
                          </Text>
                        )
                    )}
                  {currentTags.length - 2 > 0 && (
                    <Box className={styles["tag-badge-wrapper"]}>
                      <Text className={styles["tag-badge"]}>
                        +{currentTags.length - 2}
                      </Text>
                      <Box className={styles["remaining--tags"]}>
                        {currentTags.slice(2).map((tag) => (
                          <Text
                            key={tag.tag_id}
                            backgroundColor={tag?.tag_colour}
                            className={styles["highlight-tag"]}
                          >
                            {tag.tag_name}
                          </Text>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
};

const ConfirmationModalSpeakerName = ({
  modalIsOpen,
  modalOnClose,
  handleSpeakerNameEdition,
  speakerName,
  updatedSpeakerName,
  setTranscriptSpeaker,
}) => {
  return (
    <Modal
      marginTop="200px !important"
      isOpen={modalIsOpen}
      onClose={modalOnClose}
    >
      <ModalOverlay />
      <ModalContent marginTop={`280px !important`}>
        <ModalHeader className={styles["modal--header"]}>
          Person Name Replacement
        </ModalHeader>
        <ModalCloseButton
          onClick={() => {
            setTranscriptSpeaker("");
          }}
        />
        <ModalBody className={styles["modal--body"]}>
          Do you want to replace "{speakerName}" with "{updatedSpeakerName}" on
          all occurences ?
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary-gray"
            mr={3}
            onClick={() => {
              modalOnClose();
              handleSpeakerNameEdition(false);
            }}
          >
            Replace Only here
          </Button>
          <Button
            onClick={() => {
              modalOnClose();
              handleSpeakerNameEdition(true);
            }}
            variant="primary"
          >
            Replace for all
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

const PopoverEditSpeaker = ({
  isOpen,
  onOpen,
  onClose,
  transcriptSpeaker,
  setTranscriptSpeaker,
  modalOnOpen,
  speakersList,
  transcript,
  notifyToast,
}) => {
  return (
    <Popover
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      placement="auto"
      closeOnBlur={true}
    >
      <PopoverContent padding="12px">
        <PopoverHeader border="none" padding="0px">
          <Input
            maxLength="50"
            className={styles["speaker--inputField"]}
            placeholder="Select Speaker or Create Name"
            value={transcriptSpeaker}
            onChange={(e) => {
              setTranscriptSpeaker(e.target.value);
            }}
          />
          {transcriptSpeaker.length > 0 && (
            <Box
              onClick={() => {
                const isSpeakerAlreadyPresesent = speakersList.some((item) => {
                  if (item.transcript_speaker === transcriptSpeaker) {
                    return true;
                  }
                  return false;
                });
                if (isSpeakerAlreadyPresesent) {
                  notifyToast("Cannot add duplicate user", "error");
                  return;
                }
                modalOnOpen();
              }}
              display="flex"
              className={styles["createNew__container"]}
            >
              <Image mr="8px" src={AddIcon} />
              <Text> Create New "{transcriptSpeaker}"</Text>
            </Box>
          )}
        </PopoverHeader>
        <PopoverBody className={styles["speakersList--container"]}>
          {speakersList
            .filter((item) => {
              return item.transcript_speaker !== transcript.transcript_speaker;
            })
            .map((speaker: any) => {
              return (
                <Text
                  onClick={() => {
                    setTranscriptSpeaker(speaker.transcript_speaker);
                    modalOnOpen();
                  }}
                  className={styles["speakerName--container"]}
                >
                  {speaker.transcript_speaker}
                </Text>
              );
            })}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default HighlightCreator;